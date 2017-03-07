var express    = require('express');
var app        = express();
var bodyParser = require('body-parser');
var mongoose   = require('mongoose');

//db call
var url = 'mongodb://localhost:27017/measurements';
mongoose.connect(url);

//Schema to use
var Measurement = require('./app/models/measurement');

//Serve on local port
var port = process.env.PORT || 8080;
app.listen(port);

//Use express router
var router = express.Router();

//Parse requests using json
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//Server is running
router.use(function(req, res, next) {
  console.log('Something is happening.');
  next();
});

//Use /measurements route
router.route('/measurements')

  //Post a new measurement
  .post(function(req, res) {
    var measurement = new Measurement();

    var now = new Date().toISOString();
    var temperature = req.body.temperature ? req.body.temperature : '';
    var dewPoint = req.body.dewPoint ? req.body.dewPoint : '';
    var precipitation = req.body.precipitation ? req.body.precipitation : '';
    var etc = req.body.etc ? req.body.etc : '';

    //Set request to measurement object values
    measurement.timestamp = now;
    measurement.temperature = temperature;
    measurement.dewPoint = dewPoint;
    measurement.precipitation = precipitation;
    measurement.etc = etc;

    //Set Location Header
    res.setHeader('Location', '/measurements/' + measurement.timestamp);

    //Has timestamp
    if(!measurement.timestamp || measurement.timestamp == null || measurement.timestamp == undefined) {
      res.status(400).json({message: 'Must have a timestamp'});
    }

    //Must be a number value
    if(isNaN(measurement.temperature) || isNaN(measurement.dewPoint) || isNaN(measurement.precipitation)) {
        res.status(400).json({message: 'Must be a number'});
    }

    //Save measurement
    measurement.save(function(err) {
      if(err) {
        res.send(err).status(401);
      }
      
      res.status(201).json({ message: 'Measurement created'});
    })
  })

  //Find all measurements
  .get(function(req, res) {
    Measurement.find(function(err, measurements) {
      if(err) {
        res.send(err);
      }

      res.status(200).json(measurements);
    });
  });



//Look up by timestamp
router.route('/measurements/:timestamp')

  .get(function(req, res) {

    //Split Date and Time into seperate vars of timestamp
    var date = req.params.timestamp.split("T")[0];
    var time = req.params.timestamp.substr("10");

    //Get all on same Day
    if(!time || time == null) {
      Measurement.find(function(err, measurements) {
        var array = [];
        var measurementDate = date;
        for(var i = 0, j = measurements.length; i < j; i++) {
          var measurementTimestampDate = measurements[i].timestamp;
          measurementTimestampDate = measurementTimestampDate.split("T")[0];
          
          if(measurementDate === measurementTimestampDate) {
            array.push(measurements[i]);  
          }
        }

        if(err) {
          res.send(err);
        }

        if(array[0] == null) {
          res.status(404).json({message: 'Date not found'});
        }

        res.json(array);
      });

    //Get one by timestamp
    } else {
      Measurement.findOne({timestamp: req.params.timestamp}, function(err, measurement) {
        
        if(err) {
          res.send(err);
        }
        
        if(!measurement || measurement == null) {
          res.status(404).json({message: 'Timestamp not found'});
        }
        
        res.json(measurement);
      });
    }

    
  })

  //Update a measurement
  .put(function(req, res) {

    Measurement.findOneAndUpdate({timestamp: req.params.timestamp}, req.body, function(err, measurement) {
      if(err) {
        res.send(err);
      }

      var timestamp = req.params.timestamp;
      var temperature = req.body.temperature;
      var dewPoint = req.body.dewPoint;
      var precipitation = req.body.precipitation;
      var etc = req.body.etc;

      measurement.timestamp = timestamp;
      measurement.temperature = temperature;
      measurement.dewPoint= dewPoint;
      measurement.precipitation = precipitation;
      measurement.etc = etc;

      if(measurement.timestamp == null || measurement.timestamp == undefined) {
        res.status(409).json({message: 'Must have a timestamp'});
      }

      if(!measurement.timestamp) {
        res.status(404).json({message: 'Does not Exist'});
      }

      if(isNaN(measurement.temperature) || isNaN(measurement.dewPoint) || isNaN(measurement.precipitation)) {
          res.status(400).json({message: 'Must be a number'});
      }

      measurement.save(function(err) {
        if(err) {
          res.send(err);
        } else {
          res.status(200).json({ message: 'Measurement updated'});
          res.send(measurement);
        }

        
      })

    });
  })

  //Update a measurement metric
  .patch(function(req, res) {
    Measurement.findOneAndUpdate({timestamp: req.params.timestamp}, {$set: req.body}, function(err, measurement) {
      if(err) {
        res.send(err);
      }

      var timestamp = req.params.timestamp;
      var temperature = req.body.temperature ? req.body.temperature : measurement.temperature;
      var dewPoint = req.body.dewPoint ? req.body.dewPoint : measurement.dewPoint;
      var precipitation = req.body.precipitation ? req.body.precipitation : measurement.precipitation;
      var etc = req.body.etc ? req.body.etc : measurement.etc;

      measurement.timestamp = timestamp;
      measurement.temperature = temperature;
      measurement.dewPoint= dewPoint;
      measurement.precipitation = precipitation;
      measurement.etc = etc;

      if(measurement.timestamp == null || measurement.timestamp == undefined) {
        res.status(409).json({message: 'Must have a timestamp'});
      }

      if(!measurement.timestamp) {
        res.status(404).json({message: 'Does not Exist'});
      }

      if(isNaN(measurement.temperature) || isNaN(measurement.dewPoint) || isNaN(measurement.precipitation)) {
          res.status(400).json({message: 'Must be a number'});
      }

      measurement.save(function(err) {
        if(err) {
          res.send(err);
        } else {
          res.status(200).json({ message: 'Measurement updated'});
          res.send(measurement);
        }
        
      })

    });
  })

  //Remove a measurement from db
  .delete(function(req, res) {
    Measurement.remove({timestamp: req.params.timestamp}, function(err, measurement) {
      if(err) {
        res.send(err);
      }

      res.json({ message: 'Successfully Deleted'});
    
    });
  });

//Get statistics
router.route('/stats')
  .get(function(req, res) {

    var metricsQueried = [];
    var metrics = req.query.metric;
    var from = req.query.fromDateTime;
    var to = req.query.toDateTime;
    
    if(typeof metrics === typeof String()) {
      metricsQueried.push(metrics); 
    } else {
      for(var i = 0; i < metrics.length; i++) {
        metricsQueried.push(metrics[i]);
      }
    }

    //Filter by date range
    Measurement.find({
      'timestamp': {
        '$gte': from,
        '$lt': to
      }
    },function(err, measurement) {
      
      if(metricsQueried.length == 1) {
        var array = [];
      
        for(var i = 0, j = measurement.length; i < j; i++) {
          array.push(measurement[i][metrics]);
        }

        var total = 0;
        var avg = 0;
        var min = 0;
        var max = 0;
        var len = array.length;
        var labelsArr = [];
        var avgArr = [];
        var minArr = [];
        var maxArr = [];

        var sendArr = [];

        for(var i = 0; i < len; i++) {
          total += array[i];
        }

        avg = (total / len).toFixed(2);
        min = Math.min.apply(Math, array);
        max = Math.max.apply(Math, array);

        labelsArr.push('metric', 'stat', 'value');
        avgArr.push(metrics, 'min', min);
        minArr.push(metrics, 'max', max);
        maxArr.push(metrics, 'avg', avg);

        sendArr.push(labelsArr, avgArr, minArr, maxArr);
      }

      if(metricsQueried.length > 1) {
        var array = [];        
        var sendArr = [];
        
        for(var i = 0; i < metricsQueried.length; i++) {
          for(var j = 0; j < measurement.length; j++) {
            calcMetrics(measurement[j], metricsQueried[i]);
          }
        }

        function calcMetrics(measurement, metric) {
          var newArr = [];

          newArr.push(measurement[metric]);
 
          var total = 0;
          var avg = 0;
          var min = 0;
          var max = 0;
          var len = newArr.length;
          var labelsArr = [];
          var avgArr = [];
          var minArr = [];
          var maxArr = [];

          for(var i = 0; i < len; i++) {
            total += newArr;
          }

          avg = (total / len).toFixed(2);
          min = Math.min.apply(Math, newArr);
          max = Math.max.apply(Math, newArr);

          labelsArr.push('metric', 'stat', 'value');
          avgArr.push(metric, 'min', min);
          minArr.push(metric, 'max', max);
          maxArr.push(metric, 'avg', avg);

          sendArr.push(labelsArr, avgArr, minArr, maxArr);
        }
      }
      

      if(err) {
        res.send(err);
      }

      res.status(200).json(sendArr);
    });
  });

router.get('/', function(req, res) {
    res.json({ message: 'Welcome to Measurements API!' });
});

app.use('/api', router);

console.log('Connection on port ' + port + ' Successful');