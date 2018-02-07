#import <IOKit/IOKitLib.h>
#include <node.h>

using namespace v8;

/**
 * @return An array of 2 Numbers, representing Mac light sensor values, or an empty array
 * if an error occurred. Older Macs may return the same value twice as some had two
 * ambient light sensors, while most newer Macs have one ambient light sensor.
 */
void getAmbientLightValues(const FunctionCallbackInfo<Value>& args) {
    Isolate *isolate = args.GetIsolate();

    Local<Array> valuesArray = Array::New(isolate, 2);

    io_service_t service = IOServiceGetMatchingService(kIOMasterPortDefault, IOServiceMatching("AppleLMUController"));
    if (service) {
        io_connect_t connection = 0;

        if (IOServiceOpen(service, mach_task_self(), 0, &connection) == kIOReturnSuccess) {
            uint32_t outputs = 2;
            uint64_t values[outputs];

            if (IOConnectCallMethod(connection, 0, nil, 0, nil, 0, values, &outputs, nil, 0) == kIOReturnSuccess) {
                IOObjectRelease(service);

                valuesArray->Set(0, Number::New(isolate, values[0]));
                valuesArray->Set(1, Number::New(isolate, values[0]));

                args.GetReturnValue().Set(valuesArray);

                return;
            }
        }

        IOObjectRelease(service);
    }

    args.GetReturnValue().Set(valuesArray);
}

void Init(Local<Object> exports, Local<Object> module) {
    NODE_SET_METHOD(exports, "getAmbientLightValues", getAmbientLightValues);
}

NODE_MODULE(addon, Init)