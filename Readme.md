# Google Forms Auto Filler

![Google Forms Auto Filler Screenshot](build/Screenshots/Add-on%20Screenshot.png)

This extension automatically fills Google Form input fields with predefined values. For example, if you set *Name* to *John*, all input fields with the title *Name* will be populated with *John* when the page loads.

It also supports fuzzy matching, so variations like *E-mail* and *email* are matched correctly.

Get it on add-on stores:
+ Firefox: <https://addons.mozilla.org/en-US/firefox/addon/google-forms-auto-filler/>
+ Chrome: <https://chrome.google.com/webstore/detail/google-forms-auto-filler/jdjlkmjjmpdbmejkicfjokkgifdkpjek>
+ Opera: <https://addons.opera.com/en/extensions/details/google-forms-auto-filler/>

### Build

`zip -r -FS build/Chrome/GoogleFormsAutoFiller.zip * --exclude '*.git*' 'build/*'`

### Todo

+ Date, time, multiplechoice autofill
+ Make locale by i18n (priority by usage: India, Indonesia, Turkey, Vietnam, Spanish)
+ Find a way to import Handler and LevenshteinSimilarity as a package
+ Add visual to form: Save this form answer button and highlight the fields filled by extension

### Support

Feel free to [donate](https://buymeacoffee.com/muratserhatalperen) to support me in adding more features!