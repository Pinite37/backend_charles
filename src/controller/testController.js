import testSentEmail from "../services/testService.js";

function testController(req, res) {
    testSentEmail();
    res.send('Tested email retrieval, check server logs.');
}

export { testController };