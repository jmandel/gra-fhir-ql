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

[Try it live!](https://aqueous-sands-9529.herokuapp.com/http%3A%2F%2Ffhir-dev.healthintersections.com.au%2Fopen%2F?q=%7B%20Patient%20(family%3A%20%22Chalmers%22,%20id:%22example%22)%20%7B%20name%20%7B%20given%20family%20%7D%20birthDate%20with%20%7B%20Procedure%20%7B%20type%20%7B%20text%20%7D%20performer%20%7B%20person%20%7B%20...%20on%20Practitioner%20%7B%20name%20%7B%20given%20%7D%20identifier%20%7B%20system%20value%20%7D%20%7D%20%7D%20%7D%20%7D%20%7D%20%7D%20%7D)
    
Find patients named "Chalmers"; fetch their birthdates, last names, and procedure list.
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
