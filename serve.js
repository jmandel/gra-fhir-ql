var express = require('express');
var app = express();
var url = require('url');
var schema = require('./schema');
var graphql = require('graphql').graphql;

var schemaByServer = {
  "https://fhir-open-api-dstu2.smarthealthit.org/": schema("https://fhir-open-api-dstu2.smarthealthit.org/")
};

app.get('/:server', function (req, res) {
  var server = req.params.server
  schemaByServer[server] = schemaByServer[server] || schema(server);
  res.set("Content-Type", "application/json");

  var q = req.query.q;


  console.log("server", server);
  console.log("query", q);

  graphql(schemaByServer[server], q)
    .then(function(ans){
       res.end(JSON.stringify(ans, null, 2)) ;
    }).catch(function(err){
      console.log(err);
      res.end("Err" + err);
    });
});

var server = app.listen(process.env.PORT || 3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
