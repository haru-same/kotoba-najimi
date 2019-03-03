const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const mediaConfig = require('../../libs/media-config');

const gmailConfigKey = 'gmail';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'scripts/experimental/token.json';

// Load client secrets from a local file.
fs.readFile('scripts/experimental/credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Gmail API.
  authorize(JSON.parse(content), storeAddAttachements);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

let gmail = null;

const storeAttachment = (part, messageId, userId) => {
  return new Promise((resolve) => {
    gmail.users.messages.attachments.get({
      'id': part.body.attachmentId,
      'messageId': messageId,
      'userId': userId
    }, (err, attachment) => {
      fs.writeFileSync('ocr_data/' + part.filename, Buffer.from(attachment.data.data, 'base64'));

      const configData = mediaConfig.getConfig(gmailConfigKey);
      configData.processed = configData.processed || {};
      configData.processed[messageId] = true;
      configData.save();

      resolve();
    });
  });
};

/**
 * Get Attachments from a given Message.
 *
 * @param  {String} userId User's email address. The special value 'me'
 * can be used to indicate the authenticated user.
 * @param  {String} messageId ID of Message with attachments.
 * @param  {Function} callback Function to call when the request is complete.
 */
const storeAttachments = (userId, message) => {
  return new Promise((resolve, reject) => {
    const parts = message.payload.parts;
    const promises = [];
    for (const part of parts) {
      if (part.filename && part.filename.length > 0) {
        promises.push(storeAttachment(part, message.id, userId));
      }
    }
    Promise.all(promises).then(() => {
      resolve();
    });
  });
};

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function storeAddAttachements(auth, done) {
  gmail = google.gmail({version: 'v1', auth});

  return new Promise((resolve) => {
    let time = new Date();
    time.setHours(0, 0, 0, 0);
    time = time.getTime();
    time = mediaConfig.getValue(gmailConfigKey, 'lastUpdated', time);

    const newUpdatedTime = new Date().getTime();

    console.log('getting from: ', new Date(time).toLocaleDateString('PST'), new Date(time).toLocaleTimeString('PST'));

    gmail.users.messages.list({
      userId: 'me',
      q: `after:${Math.floor(time/1000)}`
    }, (err, res) => {
      if (err) return console.log('The API returned an error: ' + err);
      // console.log(res.data.messages[0]);

      if (!res.data.messages) {
        console.log('no new messages');
        return;
      }

      console.log('message count: ', res.data.messages.length);

      for (const message of res.data.messages) {
        gmail.users.messages.get({
          userId: 'me', 
          id: message.id
        }, (err, res) => {
          const promises = [];
          for(const header of res.data.payload.headers) {
            if (header.name == 'Subject' && header.value == '+') {
              console.log('Got add email: ', message.id);
              promises.push(storeAttachments('me', res.data));
            }
          }
          Promise.all(promises).then(() => {
            const configData = mediaConfig.getConfig(gmailConfigKey);
            configData.lastUpdated = newUpdatedTime;
            configData.save();

            resolve();
          });
        });
      }
    });
  });
}