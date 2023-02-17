//App setup section / requires for node packages
require("dotenv").config();
const express = require("express");
const port = process.env.PORT || 3000;
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const request = require("request");

//environment variables linked to dotenv file, used to hide API keys, usernames + passwords
const iqAirApiKey = process.env.IQ_AIR_API_KEY;
const user = process.env.USER;
const password = process.env.PASS
const iqAirWidget = process.env.IQAIR_WIDGET;
const openWeatherAPI = process.env.OPEN_WEATHER_API;

//set up express to create server
const app = express();

//direct express to use the public folder for CSS and media as well as our middleware
app.use(express.static("public"));

//set view EJS view engine to select from views folder
app.set('view engine', 'ejs');

//enable body parser
app.use(bodyParser.urlencoded({
  extended: true
}));


const emailHTML = '<h1>Hello this is only a test<h1>'; 



//create transporter via nodemailer for email functionality. This sets up where the email is coming from.
let transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  auth: {
    user: user,
    pass: password
  }
});

//configure nodemailer email,
let sendEmails = function() {
  //Create an array for the recipients, currently set to my testing email, will be updated when final email is prepared
  let mailList = [
    // "governorpolis@state.co.us", 
    "denvairQualityMonitor@proton.me",
  ];
  //Create options to pass into the .sendMail() method, this will specify the email itself. From, to, subject line and the email body.
  let options = {
    from: user,
    to: mailList,
    subject: "Denver Air Quality Has Exceeded 100 AQI",
    //Enter email here, a full HTML file can be written out if necessary for formatting.
    html: emailHTML,  
  }

//send email using nodemailer via the specified options and log either and error message or a completed message
  transporter.sendMail(options, function(err, info) {
    if (err) {
      console.log(err);
      return;
    } else {
      console.log("Sent: " + info.response);
    }
  });
};

//Create options request will use to acquire IQAir api JSON
let options = {
  method: "GET",
  url: `http://api.airvisual.com/v2/city?city=Denver&state=Colorado&country=USA&key=${iqAirApiKey}`,
  headers: {},
};

//api request to IQAir Air Visual API
request(options, function(err, response) {
  if (err) throw new Error(err);
  //define json from the response
  let jsonData = response.body;
  //parse json into js object
  let weatherData = JSON.parse(jsonData);
  //define variable to hold AQIUS data from json object
  let aqius = weatherData.data.current.pollution.aqius;
  // let aqius = 100; 
  //log AQIUS
  console.log(aqius);
  //if aqius exceeds threshold, trigger the sendEmails() function, which carries out sending the emails using nodemailer.
  if (aqius >= 100) {
    sendEmails();
    console.log(`Emails sent! AQI is above the threshold, currently at ${aqius}`)
  } else {
    console.log(`Emails not sent, AQI is below threshold, currently at ${aqius}`);
  }
});

// Create options for OpenWeather request
let openWeatherOptions = {
  method: "GET",
  url: `http://api.openweathermap.org/data/2.5/air_pollution?lat=39.742043&lon=-104.991531&appid=${openWeatherAPI}`
}

// //create variable for our Open weather pollutantData to be stored in
let pollutantData;

//follow same steps as we did using the IQAir api but instead using the OpenWeather API to get air pollution data
request(openWeatherOptions, function(err, response) {
  if (err) throw new Error(err);
  let openWeatherData = JSON.parse(response.body);
  let pollutants = openWeatherData.list[0].components;
  //Use Object.values to further hone in on the correct data
  pollutantData = Object.values(pollutants);
  //run getPollutantData function passing the pollutantData as a parameter
  // getPollutantData(pollutantData);
  return pollutantData; 
});


// fetch(`http://api.openweathermap.org/data/2.5/air_pollution?lat=39.742043&lon=-104.991531&appid=${openWeatherAPI}`)
//   .then(response => response.json())
//   .then(data => { 
//     let pollutants = data.list[0].components; 
//     let pollutantData = Object.values(pollutants); 
//   });
  


//create function to call once we have the open weather data that will render the data on screen using Express "GET" route
// let getPollutantData = function(pollutantData) {
// app.get("/", function(req, res) {
//   fetch(`http://api.openweathermap.org/data/2.5/air_pollution?lat=39.742043&lon=-104.991531&appid=${openWeatherAPI}`)
//     .then(response => response.json())
//     .then(data => { 
//       let pollutants = data.list[0].components; 
//       let pollutantData = Object.values(pollutants); 
//       // render our homepage html passing the below variables to the view. 
//       res.render("home", {
//         iqAirWidgetKey: iqAirWidget,
//         co: pollutantData[0],
//         no: pollutantData[1],
//         no2: pollutantData[2],
//         o3: pollutantData[3],
//         so2: pollutantData[4],
//         nh3: pollutantData[5],
//         pm25: pollutantData[6],
//         pm10: pollutantData[7],
//       },);
//     })
//     .catch(error => {
//       console.log(error) 
//       res.status(500).send({
//         message: e.message || 'Internal Server Error'
//       });
//     });
// });
// }

app.get("/home", function(req, res) {
  // render our homepage html passing the below variables to the view. 
  res.render("home", {
    iqAirWidgetKey: iqAirWidget,
    co: pollutantData[0],
    no: pollutantData[1],
    no2: pollutantData[2],
    o3: pollutantData[3],
    so2: pollutantData[4],
    nh3: pollutantData[5],
    pm25: pollutantData[6],
    pm10: pollutantData[7],
  },);
});

// Root route setup, in order to access and display the Open Weather JSON on index.html I set up a re-route
// where once the page loads, and has access to the JSON data our main index.html view is displayed. 
// This was to avoid getting the 'cannot get /' error that was occuring on starting the app after deployment.

app.get('/', (req, res) => {
  res.render('root'); 
});

//Express GET route for the contact page
app.get("/contact", function(req, res) {
  res.render("contact")
});
//Express server listen method for our port (declared at beginning of the file)
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
