# gra-fhir-ql
Prototype graphql implementation for FHIR
# Example

Find patients named eve; fetch their birthdates, last names, and procedure list.
```
{ 
  Patient (family: "Chalmers",  id:"example") { 
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

[Try it live!](https://aqueous-sands-9529.herokuapp.com/http%3A%2F%2Ffhir-dev.healthintersections.com.au%2Fopen%2F?q=%7B%20Patient%20(family%3A%20%22Chalmers%22,%20id:%22example%22)%20%7B%20name%20%7B%20given%20family%20%7D%20birthDate%20with%20%7B%20Procedure%20%7B%20type%20%7B%20text%20%7D%20performer%20%7B%20person%20%7B%20...%20on%20Practitioner%20%7B%20name%20%7B%20given%20%7D%20identifier%20%7B%20system%20value%20%7D%20%7D%20%7D%20%7D%20%7D%20%7D%20%7D%20%7D)

To run queries, use this URL structure: 

    GET https://aqueous-sands-9529.herokuapp.com/{fhir-server-base}?q={graphql-query}

## Develop

    git clone https://github.com/jmandel/gra-fhir-ql/
    cd gra-fhir-ql
    npm install
    npm start

