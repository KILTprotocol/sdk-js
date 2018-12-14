export const CTypeInputModel = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "http://kilt-protocol.org/draft-01/ctype-input#",
    "title": "CTYPE",
    "type": "object",
    "properties": {
        "$id": {
            "title": "Identifier",
            "type": "string",
            "format": "uri-reference"
        },
        "$schema": {
            "title": "Schema",
            "type": "string",
            "format": "uri",
            "default": "http://kilt-protocol.org/draft-01/ctype#",
            "readonly": true,
            "className": "hidden"
        },
        "title": {
            "title": "Title",
            "type": "string"
        },
        "properties": {
            "title": "Data",
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {
                        "title": "Title",
                        "type": "string",
                        "default": "New Property"
                    },
                    "$id": {
                        "title": "Identifier",
                        "type": "string",
                        "format": "uri-reference"
                    },
                    "type": {
                        "title": "Type",
                        "type": "string",
                        "enum": [
                            "string",
                            "integer",
                            "number",
                            "boolean",
                            "array"
                        ],
                        "enumTitles": [
                            "Text",
                            "Number",
                            "Decimal",
                            "Yes/No",
                            "List"
                        ]
                    }
                },
                "required": [
                    "$id",
                    "title",
                    "type"
                ]
            },
            "collapsed": false
        },
        "type": {
            "title": "Object Type",
            "type": "string",
            "default": "object",
            "readonly": true,
            "className": "hidden"
        }
    },
    "required": [
        "$id",
        "$schema",
        "title",
        "properties",
        "type"
    ]
};

export const CTypeModel = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "http://kilt-protocol.org/draft-01/ctype#",
    "type": "object",
    "properties" : {
        "schema": {
            "type": "object",
            "patternProperties": {
                "^.*$": {
                    "type": "object",
                    "properties": {
                        "type": "string"
                    }
                }
            },
            "required" : [ "$id", "$schema" ]
        },
        "hash": {
            type: "string"
        },
        "metamodel": {
            "type": "object",
            "properties" : {

            },
            "patternProperties": {
                "^.*$": {
                    "type": "object",
                    "properties": {}
                }
            }
        }
    }

};

export const CTypeWrapperModel = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "http://kilt-protocol.org/draft-01/ctype-wrapper#",
    "type": "object",
    "properties" : {
        "schema": {
            "type": "object",
            "patternProperties": {
                "^.*$": {
                    "type": "object",
                    "properties": {

                    }
                }
            }
        },
        "hash": {
            type: "string"
        },
        "metamodel": {
            "type": "object",
            "properties" : {

            },
            "patternProperties": {
                "^.*$": {
                    "type": "object",
                    "properties": {}
                }
            }
        }
    }
};