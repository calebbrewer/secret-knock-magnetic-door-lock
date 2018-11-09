const wifi = require("Wifi");
const http = require('http');

const magPin = 5;
const irSensorPin = 14;
const unlockTime = 7;
const ampThreshold = 0.58;
const secretKnock = [296.27600000007,493.41899999976,635.77900000009,471.13999999966,474.63000000035,1043.35399999981,268.05599999986,494.60300000011,1117.49099999992]; //rudolph the red nosed reindeer had a very shiny nose
//[552.65500000026,424.98100000014,255.27099999971,556.69299999997,784.53000000026,518.44900000002]; //shave and a haircut

let lastKnock = null;
let incomingKnocks = [];

const unlockDoor = (pin, time) => new Promise((resolve, reject) => {
  let wasUnlocked = !digitalRead(pin);

  console.log('Unlocking');
  digitalWrite(pin, 0);

  if (time === undefined) {
      return reject('Time is undefined');
  }
  
  if (time != null && wasUnlocked == false) {
      setTimeout(() => {
        lockDoor(pin);
        return resolve('locked');
      }, time * 1000);
  }
  else {
      return resolve('unlocked');
  }
});

const lockDoor = pin => {
  console.log('Locking');
  digitalWrite(pin, 1);
};

const checkKnock = (incomingKnock, secretKnock) => {
  let matches = [];

  incomingKnock.shift();

  if (incomingKnock.length + 3 >= secretKnock.length && incomingKnock.length - 3 <= secretKnock.length) {
    for (let i = 0; i < secretKnock.length; i++) {
      let secret = secretKnock[i];
      let incoming = incomingKnock[i];

      if (incoming <= secret + 60 && incoming >= secret - 60) {
        console.log('if', i+1);
        matches.push(true);
      }
      else {
        console.log('else', i+1);
      }
    }
  }

  if (matches.length >= secretKnock.length - 3) {
    return true;
  }
  else {
    return false;
  }
};

const onInit = () => {
  console.log('Starting...');
  lockDoor(magPin);

  wifi.connect('', {password:''}, err => {
    if (err) console.log('Error: ', err);
    console.log('Connected...', wifi.getIP());
  
    http.createServer((req, res) => {
      const query = url.parse(req.url, true).query;
      const unlockTime = query.unlockTime;
      const lock = query.lock;
      console.log(lock, unlockTime);
  
  
      if (unlockTime || unlockTime === null) {
        unlockDoor(magPin, unlockTime);
      }
      
      if (lock) {
        lockDoor(magPin);
      }
      
      res.writeHead(200);
      res.end("OK");
    }).listen(80);    
  });  
  setTimeout(() => {
    console.log('Starting Loop');
    setInterval(() => {
      let amp = analogRead();
      let time = getTime() * 1000;
      let knockTime = time - lastKnock;
      
      if (amp > ampThreshold && knockTime > 200) {
        lastKnock = time;
        incomingKnocks.push(knockTime);
        console.log('amp', amp);
        console.log(incomingKnocks.length, incomingKnocks.toString());
      }
      
      if (incomingKnocks.length > secretKnock.length - 3 && knockTime > 1500) {
        console.log('Check Knock');

        const isKnockVarifide = checkKnock(incomingKnocks, secretKnock);

        console.log(isKnockVarifide);
        
        if (isKnockVarifide) {
          unlockDoor(magPin, unlockTime);
        }
        else {
          lockDoor(magPin);
        }

        incomingKnocks = [];
        lastKnock = null;        
      }
      
      if (knockTime > 7000 && knockTime < 7010 && incomingKnocks.length) {
        console.log('Clear');
        incomingKnocks = [];
        lastKnock = null;
        console.log(knockTime);
      }
    }, 1);
  }, 10000);
 
  //IR Sensor
  setWatch(change => {
      unlockDoor(magPin, unlockTime);
      console.log('IR');

  }, irSensorPin, {repeat:true});      
};

wifi.stopAP();

save();

//setTimeout(onInit, 1000);