exports.predictUsage = (data) => {
  let sum = data.reduce((a, b) => a + b, 0);
  return sum / data.length; // simple average prediction
};