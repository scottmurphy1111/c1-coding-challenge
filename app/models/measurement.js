var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var MeasurementSchema = new Schema({
  timestamp: {type: Date, default: Date.now},
  temperature: {type: Number},
  dewPoint: {type: Number},
  precipitation: {type: Number},
  etc: {type: String}
});

module.exports = mongoose.model('Measurement', MeasurementSchema);