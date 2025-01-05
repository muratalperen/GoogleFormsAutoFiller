# Google Forms Auto Filler

![Google Forms Auto Filler Screenshot](build/Screenshots/Add-on%20Screenshot.png)

This add-on enters text into input fields of Google Forms by predefined values automatically. For example if you set *Name* as *John*, each input fields of Google Forms whose title is *Name* gets *John* value when the page is loaded.

Get it on add-on stores:
+ Firefox: <https://addons.mozilla.org/en-US/firefox/addon/google-forms-auto-filler/>
+ Chrome: <https://chrome.google.com/webstore/detail/google-forms-auto-filler/jdjlkmjjmpdbmejkicfjokkgifdkpjek>
+ Opera: <https://addons.opera.com/en/extensions/details/google-forms-auto-filler/>

### Build

`zip -r -FS build/Chrome/GoogleFormsAutoFiller.zip * --exclude '*.git*' 'build/*'`

### Todo

+ Date, time, multiplechoice autofill
+ Info page and link
+ Update screenshot, prettify readme
+ Make locale by i18n
+ Find a way to import Handler and LevenshteinSimilarity as a package
+ Add visual to form: Save this form answer button and highlight the fields filled by extension
