# gra-fhir-ql
Prototype [graphql](http://facebook.github.io/react/blog/2015/05/01/graphql-introduction.html) implementation for FHIR. This acts as a proxy server in that it receives graphql requests from a client, and turns these into FHIR REST API calls out to an authoritative server. The current prototype can handle:

 * All FHIR types and fields via introspection
 * Resource-specific search params (dashes -> underscores)
 * Patient and Encounter "compartments" via `with` field

Serious limitations include:

 * Proxies all requests to FHIR HTTP `read` and `search` calls
 * Doesn't batch queries or cache any results (that means... a lot of calls)
 * Fragile, buggy, and untested

## Develop

    git clone https://github.com/jmandel/gra-fhir-ql/
    cd gra-fhir-ql
    npm install
    npm start



 

# Example

To run queries, use this URL structure: 

    GET https://aqueous-sands-9529.herokuapp.com/{fhir-server-base}?q={graphql-query}

[Try it live: data!](https://aqueous-sands-9529.herokuapp.com/http%3A%2F%2Ffhir-dev.healthintersections.com.au%2Fopen%2F?q=%7B%20Patient%20(family%3A%20%22Chalmers%22,%20id:%22example%22)%20%7B%20name%20%7B%20given%20family%20%7D%20birthDate%20with%20%7B%20Procedure%20%7B%20type%20%7B%20text%20%7D%20performer%20%7B%20person%20%7B%20...%20on%20Practitioner%20%7B%20name%20%7B%20given%20%7D%20identifier%20%7B%20system%20value%20%7D%20%7D%20%7D%20%7D%20%7D%20%7D%20%7D%20%7D)

[Try it live: metadata!](https://aqueous-sands-9529.herokuapp.com/%7Bfhir-server-base%7D?q={__type%20(name:%20%22Practitioner%22){%20name%20fields%20{%20name%20description%20type%20{%20name%20kind%20ofType%20{name}}%20}%20}})
    
### Data example
```
{ 
  Patient (family: ["exact","Chalmers"],  id:"example") { 
    name { 
      given
      family
    } 
    birthDate
    with {
      Procedure {
        type {
          text
        }
        performer {
          person {
            ... on Practitioner {
              name {
                given
              }
              identifier {
                system
                value
              }
            }
          }
        } 
      }
    }
  }
} 
```

This returns

```
{
  "data": {
    "Patient": [
      {
        "name": [
          {
            "given": [
              "Peter",
              "James"
            ],
            "family": [
              "Chalmers"
            ]
          },
          {
            "given": [
              "Jim"
            ],
            "family": null
          }
        ],
        "birthDate": "1974-12-25",
        "with": {
          "Procedure": [
            {
              "type": {
                "text": "Biopsy of suspected melanoma L) arm"
              },
              "performer": [
                {
                  "person": {
                    "name": {
                      "given": [
                        "Adam"
                      ]
                    },
                    "identifier": [
                      {
                        "system": "http://www.acme.org/practitioners",
                        "value": "23"
                      }
                    ]
                  }
                }
              ]
            },
            {
              "type": {
                "text": "Appendectomy"
              },
              "performer": [
                {
                  "person": {
                    "name": {
                      "given": [
                        "Adam"
                      ]
                    },
                    "identifier": [
                      {
                        "system": "http://www.acme.org/practitioners",
                        "value": "23"
                      }
                    ]
                  }
                }
              ]
            },
            {
              "type": {
                "text": "Implant Pacemaker"
              },
              "performer": [
                {
                  "person": {
                    "name": {
                      "given": [
                        "Adam"
                      ]
                    },
                    "identifier": [
                      {
                        "system": "http://www.acme.org/practitioners",
                        "value": "23"
                      }
                    ]
                  }
                }
              ]
            },
            {
              "type": {
                "text": "Biopsy of suspected melanoma L) arm"
              },
              "performer": [
                {
                  "person": {
                    "name": {
                      "given": [
                        "Adam"
                      ]
                    },
                    "identifier": [
                      {
                        "system": "http://www.acme.org/practitioners",
                        "value": "23"
                      }
                    ]
                  }
                }
              ]
            },
            {
              "type": {
                "text": "Appendectomy"
              },
              "performer": [
                {
                  "person": {
                    "name": {
                      "given": [
                        "Adam"
                      ]
                    },
                    "identifier": [
                      {
                        "system": "http://www.acme.org/practitioners",
                        "value": "23"
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      }
    ]
  }
}
```

### Metadata example

List all fields of the Practitioner type

```
{
  __type (name: "Practitioner") {
    name 
    fields { 
      name 
      description
      type {
        name 
        kind 
        ofType {name}}}}}

```

This returns

```
{
  "data": {
    "__type": {
      "name": "Practitioner",
      "fields": [
        {
          "name": "id",
          "description": "The logical id of the resource, as used in the url for the resource. Once assigned, this value never changes.",
          "type": {
            "name": "String",
            "kind": "SCALAR",
            "ofType": null
          }
        },
        {
          "name": "meta",
          "description": "The metadata about the resource. This is content that is maintained by the infrastructure. Changes to the content may not always be associated with version changes to the resource.",
          "type": {
            "name": "Meta",
            "kind": "OBJECT",
            "ofType": null
          }
        },
        {
          "name": "implicitRules",
          "description": "A reference to a set of rules that were followed when the resource was constructed, and which must be understood when processing the content.",
          "type": {
            "name": "String",
            "kind": "SCALAR",
            "ofType": null
          }
        },
        {
          "name": "language",
          "description": "The base language in which the resource is written.",
          "type": {
            "name": "String",
            "kind": "SCALAR",
            "ofType": null
          }
        },
        {
          "name": "text",
          "description": "A human-readable narrative that contains a summary of the resource, and may be used to represent the content of the resource to a human. The narrative need not encode all the structured data, but is required to contain sufficient detail to make it \"clinically safe\" for a human to just read the narrative. Resource definitions may define what content should be represented in the narrative to ensure clinical safety.",
          "type": {
            "name": "Narrative",
            "kind": "OBJECT",
            "ofType": null
          }
        },
        {
          "name": "extension",
          "description": "May be used to represent additional information that is not part of the basic definition of the resource. In order to make the use of extensions safe and manageable, there is a strict set of governance  applied to the definition and use of extensions. Though any implementer is allowed to define an extension, there is a set of requirements that SHALL be met as part of the definition of the extension.",
          "type": {
            "name": null,
            "kind": "LIST",
            "ofType": {
              "name": "Extension"
            }
          }
        },
        {
          "name": "modifierExtension",
          "description": "May be used to represent additional information that is not part of the basic definition of the resource, and that modifies the understanding of the element that contains it. Usually modifier elements provide negation or qualification. In order to make the use of extensions safe and manageable, there is a strict set of governance applied to the definition and use of extensions. Though any implementer is allowed to define an extension, there is a set of requirements that SHALL be met as part of the definition of the extension. Applications processing a resource are required to check for modifier extensions.",
          "type": {
            "name": null,
            "kind": "LIST",
            "ofType": {
              "name": "Extension"
            }
          }
        },
        {
          "name": "identifier",
          "description": "An identifier that applies to this person in this role.",
          "type": {
            "name": null,
            "kind": "LIST",
            "ofType": {
              "name": "Identifier"
            }
          }
        },
        {
          "name": "name",
          "description": "A name associated with the person.",
          "type": {
            "name": "HumanName",
            "kind": "OBJECT",
            "ofType": null
          }
        },
        {
          "name": "telecom",
          "description": "A contact detail for the practitioner, e.g. a telephone number or an email address.",
          "type": {
            "name": null,
            "kind": "LIST",
            "ofType": {
              "name": "ContactPoint"
            }
          }
        },
        {
          "name": "address",
          "description": "The postal address where the practitioner can be found or visited or to which mail can be delivered.",
          "type": {
            "name": null,
            "kind": "LIST",
            "ofType": {
              "name": "Address"
            }
          }
        },
        {
          "name": "gender",
          "description": "Administrative Gender - the gender that the person is considered to have for administration and record keeping purposes.",
          "type": {
            "name": "String",
            "kind": "SCALAR",
            "ofType": null
          }
        },
        {
          "name": "birthDate",
          "description": "The date of birth for the practitioner.",
          "type": {
            "name": "String",
            "kind": "SCALAR",
            "ofType": null
          }
        },
        {
          "name": "photo",
          "description": "Image of the person.",
          "type": {
            "name": null,
            "kind": "LIST",
            "ofType": {
              "name": "Attachment"
            }
          }
        },
        {
          "name": "practitionerRole",
          "description": "The list of Roles/Organizations that the Practitioner is associated with.",
          "type": {
            "name": null,
            "kind": "LIST",
            "ofType": {
              "name": "Practitioner.practitionerRole"
            }
          }
        },
        {
          "name": "qualification",
          "description": "Qualifications obtained by training and certification.",
          "type": {
            "name": null,
            "kind": "LIST",
            "ofType": {
              "name": "Practitioner.qualification"
            }
          }
        },
        {
          "name": "communication",
          "description": "A language the practitioner is able to use in patient communication.",
          "type": {
            "name": null,
            "kind": "LIST",
            "ofType": {
              "name": "CodeableConcept"
            }
          }
        }
      ]
    }
  }
}
```
