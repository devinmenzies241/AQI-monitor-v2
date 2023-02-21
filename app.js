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

//Create the email that will be sent once the AQI threshold is exceeded
const emailHTML = '<h1>Hello this is only a test<h1>'; 

//Create transporter via nodemailer for email functionality. This sets up where the email is coming from.
let transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  auth: {
    user: user,
    pass: password
  }
});

//Configure nodemailer email,
let sendEmails = function() {
  //Create an array for the recipients, currently set to my testing email, will be updated when final email is prepared
  let mailList = [
    // "governorpolis@state.co.us", // Main recipient, the governor's office email 
    "denvairQualityMonitor@proton.me", // my testing email, I also want to be alerted when the emails are sent
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

//Create options the Request module will use to acquire IQAir api JSON
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

// Create options for OpenWeather API request
let openWeatherOptions = {
  method: "GET",
  url: `http://api.openweathermap.org/data/2.5/air_pollution?lat=39.742043&lon=-104.991531&appid=${openWeatherAPI}`
}

// //create variable for our Open weather pollutantData to be stored in, this prevents scoping error
let pollutantValues;

//follow same steps as we did using the IQAir api but instead using the OpenWeather API to get air pollution data
request(openWeatherOptions, function(err, response) {
  if (err) throw new Error(err);
  let openWeatherData = JSON.parse(response.body);
  let pollutants = openWeatherData.list[0].components;
  pollutantValues = Object.values(pollutants);  //Use Object.values to get an array of values, rather than the object with key: value pairs
  getPollutantData(pollutantValues); //run getPollutantData function passing the pollutantData as a parameter
});

//create function to call once we have the open weather data that will render the data on screen using Express "GET" route
let getPollutantData = () => {
  app.get("/home", function(req, res) {
    // render our homepage html passing the below variables to the view. 
    res.render("home", {
      iqAirWidgetKey: iqAirWidget,
      co: pollutantValues[0],
      no: pollutantValues[1],
      no2: pollutantValues[2],
      o3: pollutantValues[3],
      so2: pollutantValues[4],
      nh3: pollutantValues[5],
      pm25: pollutantValues[6],
      pm10: pollutantValues[7],
    },);
  });
}
// Because of how Request, Express and EJS templates work I could not render the API data to the root route on page load
// without encountering a 'cannot get / ' or 'Internal Server Error'. This was because the HTML was trying to render the 
// injected EJS values into the document before they were retreived from the API response. I tried to wrap the root route
// in a function that processed the request first, then passed the data into the HTML using res.render(), however
// this caused an error upon loading the page. Once the browser was refreshed the API data would have arrived and the 
// browser could render the EJS values, but that was not an acceptable bug. I have now created a new route to a copy of 
// the homepage but one that will load and render the api data via EJS once a button is pressed. So the root route will 
// display a button to get the data, and once that is clicked it will follow the secondary /home route to render the data
// without error. In the future this sort of thing would be much better completed using React or some front-end framework
app.get('/', (req, res) => {
  res.render('root'); 
});

//Express GET route for the contact page
app.get("/contact", function(req, res) {
  res.render("contact")
});

//Tell express to start the server on the aformentioned port 
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
