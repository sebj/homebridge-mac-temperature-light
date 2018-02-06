{
    'targets': [
        {
            'target_name': 'Light',
            'sources': ['src/Light.mm'],
            'conditions': [['OS=="mac"', {
                'xcode_settings': {
                    'OTHER_LDFLAGS': ['-framework IOKit']
                }
            }]]
        },
        {
            'target_name': 'Temperature',
            'sources': ['src/Temperature.h','src/Temperature.mm'],
            'conditions': [['OS=="mac"', {
                'xcode_settings': {
                    'OTHER_CPLUSPLUSFLAGS': ['-std=c++11'],
                    'OTHER_LDFLAGS': ['-framework IOKit']
                }
            }]]
        }
    ]
}