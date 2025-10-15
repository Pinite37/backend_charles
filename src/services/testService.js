import EmailSent from "../models/EmailSent.js";


function testSentEmail() {
    EmailSent.find({}).then(emails => {
        console.log('Retrieved emails:', emails);
    }).catch(err => {
        console.error('Error retrieving emails:', err);
    });
}

export { testSentEmail };