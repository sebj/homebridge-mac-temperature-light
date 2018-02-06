{
    'targets': [
        {
            'target_name': 'Light',
            'sources': ['src/Light.mm'],
            'conditions': [['OS=="mac"', {
                'xcode_settings': {
                    'OTHER_LDFLAGS': [
                        '-framework IOKit'
                    ]
                }
            }]]
        }
    ]
}