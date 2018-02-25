# Kotoba Najimi (言葉馴染み)

This is a tool for learning Japanese designed to work with text hooking. This tool displays text with furigana, includes a mouseover dictionary based on Rikai-chan and has basic SRS support. It has only been tested with Google Chrome. This is still pretty hacky and incomplete, so expect bugs and missing information.

## Functionality

* Look up works with a mouseover dictionary based on Rikai-chan
* Read with automatically generated furigana (though it is not 100% accurate)
* Play on one device and learn on another - you can connect the tool to any device on your local network
* Generate SRS reviews for Kanji readings with a single click

## Set-up

Currently there is no standalone installer. 


You will need [node.js](https://nodejs.org/en/) and Google Chrome on your computer. I recommend the recommended current version (8.9.4 at the time of writing).

Open the command line and go to the language-companion directory. Then run npm install to download the dependencies.
```
cd kotoba-shituji
npm install
```

Once the packages have finished installing, use node to start the application.
```
node index.js
```

The tool should open in a new window in Google Chrome. If you need to restart the server and don't want the window to re-open, you can use:
```
node index.js nowindow
```