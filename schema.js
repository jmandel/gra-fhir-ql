var fs = require('fs');

var graphql = require('graphql');
var merge = require('merge');
var Promise = require('es6-promise').Promise;
var request = require('request');
var util = require('util');

var GraphQLEnumType = graphql.GraphQLEnumType;
var GraphQLInterfaceType = graphql.GraphQLInterfaceType;
var GraphQLObjectType = graphql.GraphQLObjectType;
var GraphQLList = graphql.GraphQLList;
var GraphQLNonNull = graphql.GraphQLNonNull;
var GraphQLSchema = graphql.GraphQLSchema;
var GraphQLString = graphql.GraphQLString;
var GraphQLInt = graphql.GraphQLInt;
var GraphQLBoolean = graphql.GraphQLBoolean;
var GraphQLFloat = graphql.GraphQLFloat;
var GraphQLUnionType = graphql.GraphQLUnionType;

var fhirSearchParamFromField = {};
var searchParams = clone(require("./search-parameters.json"))
.entry.map(plain).map(function(p){
  p.fieldArgName = asFieldArgName(p.name);
  return p;
});

function asFieldArgName(s){
  var ret = s.replace(/-/g, "_");
  if (ret[0] === '_'){
    ret = ret.slice(1);
  }
  fhirSearchParamFromField[ret] = s;
  return ret;
}

function asFhirSearchParam(k){
  return fhirSearchParamFromField[k];
}

var searchParamsByType = searchParams.reduce(function(coll, item){
  if (item.base[0] === item.base[0].toUpperCase()) {
    coll[item.base] = coll[item.base]  || [];
    coll[item.base].push(item);
  } 
  return coll;
}, {});

Object.keys(searchParamsByType).forEach(function(k){
  searchParamsByType[k].push({name: "_id", fieldArgName: "id"});
});

// searchParamsByType['Patient'][55]
function clone(o){
  return JSON.parse(JSON.stringify(o));
}

function plain(r){
  delete r.resource.text;
  return r.resource;
}

function addItem(coll, item){
  coll[item.path] = item;
  return coll;
}

function firstToUpper(s){
  return s[0].toUpperCase() + s.substr(1);
}

function handleX(e){
  if (e.path.match(/\[x\]/)){
    return e.type.map(function(t){
      var oneType = clone(e);
      oneType.path = oneType.path.replace("[x]", firstToUpper(t.code));
      oneType.type = [t];
      return oneType;
    });
  } else {
    return e;
  }
}

Array.prototype.flatMap = function(lambda) { 
  return Array.prototype.concat.apply([], this.map(lambda)); 
};

var structures = {};

function importStructures(file, structures) {
  return JSON.parse(JSON.stringify(require(file))).
  entry.
  map(plain).
  filter(function(item){return !!item.snapshot && item.snapshot.element.length> 0;}).
  flatMap(function(sd){ return sd.snapshot.element; }).
  flatMap(handleX).
  reduce(addItem, structures);
}

structures = importStructures("./profiles-resources.json", structures);
structures = importStructures("./profiles-types.json", structures);


Object.keys(structures).forEach(function(item){
  var path = structures[item].path;
  if (path.match(/\.contained$/)) return;
  var prefix = path.split(".").slice(0,-1).join(".");
  if (prefix.length === 0) return;
  structures[prefix].children = structures[prefix].children || [];
  structures[prefix].children.push(path);
});


structures.code = {
  "path":"code",
  "short":"Primitive Type id",
  "definition":"Short code (no def)",
  "comments":"RFC 4122",
  "min":0,
  "max":"*",
  "base":{"path":"string","min":0,"max":"*"},
  "type":[{"code":"Element"}],
  "children":["code.extension","code.value","code.id"]
};

allResourceNames = Object.keys(structures).
filter(function(k){
  return structures[k].type && structures[k].type[0].code === "DomainResource";
});



function resourceFromUri(p){
  return p.split("/").slice(-1)[0];
}

var namesToPaths =  Object.keys(structures).
filter(function(s){
  s = structures[s];
  return !!s.name;
}).
map(function(s){
  s = structures[s];
  return [s.path.split(".")[0] + " " + s.name, s.path];
}).
reduce(function(coll, item){
  coll[item[0]] = item[1];
  return coll;
}, {});

function makeSchema (server) {
  var gtypes = {};
  ['time', 'base64Binary',  'instant', 'uri', 'string', 'dateTime', 'date', 'xhtml'].
  forEach(function(t){
    gtypes[t] = GraphQLString;    
  });

  gtypes.decimal = GraphQLFloat; 
  gtypes.boolean = GraphQLBoolean; 
  gtypes.integer = GraphQLInt; 

  Object.keys(structures).
  sort(function(a, b){
    return a.replace(/[^\.]/gi, "").length - b.replace(/[^\.]/gi, "").length;
  }).
  forEach(toGtype);

  var dtypes = JSON.parse(JSON.stringify(require("./profiles-types.json"))).
  entry.
  map(plain).
  filter(function(x){return x.kind=='datatype' && !!x.constrainedType;}).
  forEach(function(t){
    gtypes[t.id] = gtypes[t.constrainedType];
  });


  function typeOfResource(r){
    var ret = r.resourceType;
    var ret = gtypes[ret];
    console.log("resolved to", r.resourceType);
    return ret;
  }


  function toGtype(path){
    var struct = structures[path];
    var ret;
    if (!!struct.nameReference){
      ret = gtypes[namesToPaths[struct.nameReference]];
    } else if (struct.type === undefined){
      ret = null;
    } else if (struct.type.length > 1) {

      ret = new GraphQLUnionType({
        name: path,
        resolveType: typeOfResource,
        types: struct.type.
        flatMap(function(t) {
          if (t.code === 'Reference') {
            return t.profile.
            map(function(p){
              return resourceFromUri(p);
            });
          } else {
            return t.code;
          }
        }).
        filter(function(r){return ['any', 'Resource'].indexOf(r) === -1;}).
        map(function(r){
          //  console.log("map", path, r, !!cache[r])
          return gtypes[r];
        })
      });
    } else {
      ret = new GraphQLObjectType({
        name: struct.path,
        description: struct.definition,
        fields: function(){
          //console.log("field sfor", struct)
          return (struct.children || []).map(function(subpath){
            var name = subpath.split(".").slice(-1)[0];
            var substruct = structures[subpath];
            var wrapList = (substruct.max === '*') ? function(x){return new GraphQLList(x);} : function(x){return x;};
            // console.log("eval substr", substruct, substruct.type)
            var nextType = gtypes[subpath] || 'default no such ' + path + subpath;
            var isReference = substruct.type.
            map(function(t){return t.code;}).
            filter(function(c){return c === "Reference";}).
            length > 0;

            if (substruct.type.length === 1 && substruct.type[0].code  == 'Reference') {
              var profileUrl = substruct.type[0].profile ? substruct.type[0].profile[0] : "/any" ;
              nextType = gtypes[resourceFromUri(profileUrl)];
            } else if (substruct.type.length === 1 && substruct.type[0].code!=="Element") {
              var code = substruct.type[0].code;
              if (code === '*') {
                code = 'Resource';
              }
              nextType = gtypes[code] || "one-type no such " +code +"(code)" + path + subpath +substruct.type[0].code;
            } 
            //console.log(path, subpath, isReference)
            return [name, {
              type: wrapList(nextType),
              description: substruct.definition,
              resolve: isReference ? resolveByGet : undefined
            }];
          }).reduce(function(coll, item){
            coll[item[0]] = item[1];
            return coll;
          }, extraFieldsFor(struct.path));
        }
      });

    }

    gtypes[path] = gtypes[path] || ret;
    return ret;
  }

  function resolveBySearch(root, args, ctx){
    globalRoot = root;
    globalArgs = args;
    globalCtx = ctx;

    var resource = globalCtx.returnType.ofType.name;
    var urlParams = Object.keys(args).reduce(function(coll, item){
      var k = encodeURIComponent(item + (args[item].length === 1 ? '' : ":" + args[item][0]));
      k = asFhirSearchParam(k);
      var v = encodeURIComponent(args[item].length === 1 ?  args[item][0] : args[item][1] );
      coll.push(k + '=' + v);
      return coll;
    }, (root && root.extraArgs || [])).join("&");
    // console.log("params", urlParams);

    var promise = new Promise(function(resolve, reject){
      var url = server + resource + "?" + urlParams;
      console.log("search GET " + url)
      req.get(url, function(err, response, body){
        body = JSON.parse(body);
        var matches = body.entry ? body.entry.map(function(e){return e.resource;}) : [];
        //console.log("Matches", matches)
        resolve(matches);
      });
    });
    return promise;
  }

  function resolveByGet(root, args, ctx){
    console.log("Resolve by get ", root.resourceType, root.id);
    byGetArgs = {root:root, args:args, ctx:ctx};
    var refs =  root[ctx.fieldName];
    if(!util.isArray(refs)) refs = [refs];
    var promises = refs.map(function(ref){
      return new Promise(function(resolve, reject){
        var url = server + ref.reference;
        console.log("read GET " + url)

        req.get(url, function(err, response, body){
          body = JSON.parse(body);
          //console.log("Matches", body)
          resolve(body);
        });
      });
    });

    return Promise.all(promises).then(function(r){
      if (ctx.returnType instanceof GraphQLList) {
        return r;
      } 
      if (r.length > 1) {throw "Got list when expected a singleton " + root + "," + ctx.fieldName;}
      if (r.length === 1) {return r[0];}
      console.log("No result at");
      return null;
    });
  }


  gtypes.Resource = gtypes.any = new GraphQLUnionType({
    name: "Any Resource",
    resolveType: typeOfResource,
    types: allResourceNames.map(function(r){ return gtypes[r];})});


    var withFields;
    function extraFieldsFor(path){

      if (path === "Patient"){
        return {
          "with": {
            "description": "Resources related to this patient",
            "type":  gtypes.root,
            "resolve": function(root, args, ctx) {
              withFields = {root: root, args: args, ctx: ctx};
              // console.log("Resolve with fields at", root)
              return {"extraArgs": ["patient=" + root.id]};
            }
          }

        };
      }

      if (path === "Encounter"){
        return {
          "with": {
            "description": "Resources related to this encounter",
            "type":  gtypes.root,
            "resolve": function(root, args, ctx) {
              withFields = {root: root, args: args, ctx: ctx};
              //console.log("Resolve with fields at", root)
              return {"extraArgs": ["encounter=" + root.id]};
            }
          }

        };
      }

      return {};
    }

    gtypes.SearchParam = new GraphQLList(GraphQLString);

    function rootFields(){
      return allResourceNames.
      map(function(r){
        return [
          r, {
            type: new GraphQLList(gtypes[r]),
            description: "Get all resources of type " + r,
            args: (searchParamsByType[r] || []).reduce(function(coll, item){
              // console.log("Check",  r, item.name, item.type, !!searchParamGtypes[item.type])
              coll[item.fieldArgName] = {
                description: item.description,
                type: gtypes.SearchParam
              };
              return coll;
            }, { }),
            resolve: resolveBySearch
          }
      ];}).
      reduce(function(coll, item){
        coll[item[0]] = item[1];
        return coll;
      }, {});
    }

    gtypes.root = new GraphQLObjectType({
      name: 'Query',
      fields: rootFields
    });

    var req = request.defaults({
      headers: {'Accept': 'application/json'}
    });

    return new GraphQLSchema({
      query: gtypes.root
    });
}

module.exports = makeSchema;
