/*
 *
 */

// Polyfill to ensure we can always call requestAnimaionFrame
if(!window.requestAnimationFrame) {
    window.requestAnimationFrame = (function() {
        return  window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function(callback, element) {
                window.setTimeout(function() {
                    callback(new Date().getTime());
                }, 1000 / 60);
            };
    })();
}
/*
 * Provides cancelRequestAnimationFrame in a cross browser way.
 * @ignore
 */
if(!window.cancelRequestAnimFrame) {
    window.cancelRequestAnimFrame = (function() {
        return window.cancelCancelRequestAnimationFrame ||
            window.webkitCancelRequestAnimationFrame ||
            window.mozCancelRequestAnimationFrame 	  ||
            window.oCancelRequestAnimationFrame      ||
            window.msCancelRequestAnimationFrame     ||
            window.clearTimeout;
    })();
}

/*
 * Start the render loop, cross-browser support
 */
function startRenderLoop(callback)
{
    var startTime = 0;

    var lastTimeStamp = startTime;
    var lastFpsTimeStamp = startTime;
    var framesPerSecond = 0;
    var frameCount = 0;

    function nextFrame(time)
    {
        //console.log(time);
        // Recommendation from Opera devs: calling the RAF at the beginning of your
        // render loop improves framerate on browsers that fall back to setTimeout
        window.requestAnimationFrame(nextFrame);

        // Update FPS if a second or more has passed since last FPS update
        if(lastTimeStamp - lastFpsTimeStamp >= 1000)
        {
            framesPerSecond = frameCount;
            frameCount = 0;
            lastFpsTimeStamp = lastTimeStamp;
        }

        frameCount++;
        var last = lastTimeStamp;
        lastTimeStamp = time;

        callback({
            startTime: startTime,
            timeStamp: time,
            elapsed: time-startTime,
            frameTime: time-last,
            framesPerSecond: framesPerSecond
        });
    };
    window.requestAnimationFrame(nextFrame);
};

var client = null;

var EdenClient = function()
{
    var self = this;
    self.name = "Eden Client";
    self.version = "v0.0.1";

    self.canvas =  null;
    self.currentScene = null;
    self.scenes = [];
};

EdenClient.prototype.init = function(context)
{
    var self = this;
    self.canvas = document.getElementById(context);

    self.scenes.push(new scene_eden());
    self.currentScene = self.scenes[0];
    self.currentScene.init(self.canvas);

    console.log(self);
    startRenderLoop(self.run);
};

EdenClient.prototype.run = function(timing)
{
    var self = client;
    $('#fps')[0].innerHTML = "FPS: " + timing.framesPerSecond;
    self.currentScene.render(timing);
    self.currentScene.update(timing);
};

$(document).ready(function()
{
    console.log(document);
    client = new EdenClient();
    client.init("gameCanvas");
});