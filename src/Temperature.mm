#include "Temperature.h"
#include <vector>
#include <node.h>

using namespace v8;

using SP78 = UInt8[2];
using SMCBytes = UInt8[32];

struct SMCParamStruct {
    
    typedef enum {
        kSMCHandleYPCEvent = 2,
        kSMCReadKey = 5,
        kSMCGetKeyInfo = 9
    } Selector;
    
    typedef enum {
        kSMCSuccess = 0,
        kSMCError = 1,
        kSMCKeyNotFound = 132
    } Result;
    
    struct SMCVersion {
        unsigned char major;
        unsigned char minor;
        unsigned char build;
        unsigned char reserved;
        unsigned short release;
    };
    
    struct SMCPLimitData {
        UInt16 version;
        UInt16 length;
        UInt32 cpuPLimit;
        UInt32 gpuPLimit;
        UInt32 memPLimit;
    };
    
    struct SMCKeyInfoData {
        IOByteCount dataSize;
        UInt32 dataType;
        UInt8 dataAttributes;
    };
    
    UInt32 key;
    SMCVersion vers;
    SMCPLimitData pLimitData;
    SMCKeyInfoData keyInfo;
    UInt8 result;
    UInt8 status;
    UInt8 data8;
    UInt32 data32;
    SMCBytes bytes;
};

static UInt32 to_UInt32(const char *key) {
    UInt32 byte0 = UInt32(key[0]) << 24;
    UInt32 byte1 = UInt32(key[1]) << 16;
    UInt32 byte2 = UInt32(key[2]) << 8;
    UInt32 byte3 = UInt32(key[3]);
    
    return byte0 | byte1 | byte2 | byte3;
}

static double to_double(SP78 bytes) {
    double sign = (bytes[0] & 0x80) == 0 ? 1.0 : -1.0;
    return sign * double(bytes[0] & 0x7F);
}

static io_connect_t connection = 0;

bool openSMC() {
    io_service_t service = IOServiceGetMatchingService(kIOMasterPortDefault,
                                                       IOServiceMatching("AppleSMC"));

    if (service != 0) {
        kern_return_t result = IOServiceOpen(service, mach_task_self(), 0, &connection);
        IOObjectRelease(service);

        return result == kIOReturnSuccess;
    }
    
    return false;
}

bool closeSMC() {
    return IOServiceClose(connection) == kIOReturnSuccess;
}

static SMCParamStruct* callDriver(SMCParamStruct *inputStruct) {
    size_t inputStructSize  = sizeof(SMCParamStruct);
    size_t outputStructSize = sizeof(SMCParamStruct);
    
    SMCParamStruct outputStruct;
    memset(&outputStruct, 0, sizeof(SMCParamStruct));
    
    kern_return_t result = IOConnectCallStructMethod(connection, SMCParamStruct::kSMCHandleYPCEvent,
                                                     inputStruct,
                                                     inputStructSize,
                                                     &outputStruct,
                                                     &outputStructSize);
    
    if (result == kIOReturnSuccess) {
        SMCParamStruct *outputStructPtr;
        outputStructPtr = &outputStruct;
        
        return outputStructPtr;
    }
    
    return nullptr;
}

static SMCBytes* readData(const char *key) {
    SMCParamStruct inputStruct;
    memset(&inputStruct, 0, sizeof(SMCParamStruct));
    
    inputStruct.key = to_UInt32(key);
    inputStruct.keyInfo.dataSize = 2;
    inputStruct.data8 = SMCParamStruct::kSMCReadKey;
    
    SMCParamStruct *outputStruct = callDriver(&inputStruct);
    if (outputStruct == nullptr) {
        return nullptr;
        
    } else {
        SMCBytes *returnData;
        returnData = &outputStruct->bytes;
        
        return returnData;
    }
}

bool isKeyFound(const char *key) {
    SMCParamStruct inputStruct;
    memset(&inputStruct, 0, sizeof(SMCParamStruct));
    
    inputStruct.key = to_UInt32(key);
    inputStruct.data8 = SMCParamStruct::kSMCGetKeyInfo;
    
    SMCParamStruct *outputStructPtr = callDriver(&inputStruct);
    SMCParamStruct outputStruct = *outputStructPtr;
    return outputStructPtr != nullptr && outputStruct.result == SMCParamStruct::kSMCSuccess;
}

static const char* temperatureSensors[] = {
    AMBIENT_AIR_0,
    AMBIENT_AIR_1,
    CPU_0_DIE,
    CPU_0_DIODE,
    CPU_0_HEATSINK,
    CPU_0_PROXIMITY,
    ENCLOSURE_BASE_0,
    ENCLOSURE_BASE_1,
    ENCLOSURE_BASE_2,
    ENCLOSURE_BASE_3,
    GPU_0_DIODE,
    GPU_0_HEATSINK,
    GPU_0_PROXIMITY,
    HDD_PROXIMITY,
    HEATSINK_0,
    HEATSINK_1,
    HEATSINK_2,
    LCD_PROXIMITY,
    MEM_SLOT_0,
    MEM_SLOTS_PROXIMITY,
    MISC_PROXIMITY,
    NORTHBRIDGE,
    NORTHBRIDGE_DIODE,
    NORTHBRIDGE_PROXIMITY,
    ODD_PROXIMITY,
    PALM_REST,
    PWR_SUPPLY_PROXIMITY,
    THUNDERBOLT_0,
    THUNDERBOLT_1,
    WIRELESS_MODULE
};

bool autoOpenSMC() {
    return connection == 0? openSMC() : true;
}

double getTemperature(const char *sensorCode) {
    if (autoOpenSMC()) {
        SMCBytes *bytes = readData(sensorCode);
        
        if (bytes != nullptr)
            return to_double(SP78 { *bytes[0], *bytes[1] });
    }
    
    return 0.0;
}

std::vector<const char *> allKnownTemperatureSensors() {
    std::vector<const char *> sensors;
    
    if (autoOpenSMC())
        for (auto &sensor : temperatureSensors)
            if (isKeyFound(sensor))
                sensors.push_back(sensor);
    
    return sensors;
}

void getTemperatureSensorValues(const FunctionCallbackInfo<Value>& args) {
    std::vector<const char *> sensors = allKnownTemperatureSensors();

    Isolate *isolate = args.GetIsolate();
    Local<Array> valuesArray = Array::New(isolate, sensors.size());

    for (std::vector<int>::size_type i = 0; i != sensors.size(); i++) {
        auto sensor = sensors[i];
        auto temp = getTemperature(sensor);
        if (temp != 0)
            valuesArray->Set(i, Number::New(isolate, temp));
    }
    
    closeSMC();

    args.GetReturnValue().Set(valuesArray);
}

void Init(Local<Object> exports, Local<Object> module) {
    NODE_SET_METHOD(exports, "getTemperatureSensorValues", getTemperatureSensorValues);
}

NODE_MODULE(addon, Init)