const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.sendTo(console);

const html = fs.readFileSync('index.html', 'utf8');
const scriptCode = fs.readFileSync('script.js', 'utf8');

const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "http://localhost/",
    virtualConsole
});
dom.window.eval(`
    window.performance = { now: () => Date.now() };
    window.requestAnimationFrame = (cb) => setTimeout(cb, 16);
`);
dom.window.eval(scriptCode);

setTimeout(() => {
    console.log("WAIT OK");
    console.log("balls:", dom.window.balls.length);
    console.log("heroBall:", dom.window.heroBall);
    
    // Forcing hero sequence immediately
    dom.window.initHeroBall();
    console.log("initHeroBall called");
    
    let frames = 0;
    const interval = setInterval(() => {
        const b = dom.window.heroBall;
        if (!b) return;
        console.log(`t: ${frames}, mode: ${b.mode}, x: ${b.x && b.x.toFixed(2)}, y: ${b.y && b.y.toFixed(2)}`);
        frames++;
        if (frames > 20) {
            clearInterval(interval);
            process.exit(0);
        }
    }, 100);
}, 1000);
