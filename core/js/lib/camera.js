/*
 * William Miller
 *
 */

/*
 * Basic Mat4 camera
 */

var camera = function(config)
{
    var self = this;
    self.moving = false;
    self.rotation = vec3.create();

    self.moveDelta = 0;
    self.position = vec3.create([0,0,0]);
    self.moving = false;

    // Eye Values
    self.focalLength = 58;
    self.focusDistance = 0.95;
    self.fStop = 8.0;
    self.sensorSize = 35.0; // default 35.0mm
    self.PPM = 0; // Pixel per meter
    self.blurCoefficient = 0;
    self.near = 0.25;
    self.far = 20;
    self.ctxWidth = 0;
    self.ctxHeight = 0;
    // Average speed = 4 mph = 107 meters / min  = 1.78 meters / second
    self.speed = 1.78;
    self.boost = 5; // 3
    self.height = 1.8; // 1.8 m 5'8"
    self.ground = 0.0;
    self.viewMatrix = mat4.create();
    self.keys = new Array(128);
    self.shift = false;
    self.dirty = true;
};

camera.prototype.init = function(context)
{
    var self = this;
    self.ctxWidth = context.width;
    self.ctxHeight = context.height;
    self.PPM = Math.sqrt((self.ctxWidth * self.ctxWidth) + (self.ctxHeight * self.ctxHeight)) / self.sensorSize;

    var lastX, lastY;
    // Set up the appropriate event hooks
    // Set up the appropriate event hooks
    document.addEventListener("keydown", function (event) {
        self.keys[event.keyCode] = true;
        if(event.keyCode == 32) { // Prevent the page from scrolling
            event.preventDefault();
            return false;
        }
        if(event.shiftKey)
        {
            self.shift = true;
        }
        return true;
    }, true);

    document.addEventListener("keyup", function (event) {
        self.keys[event.keyCode] = false;
        if(self.shift) {self.shift = false;}
    }, false);


    function getTouchPosition(touch, frameElement)
    {
        var x;
        var y;
        if (touch.pageX || touch.pageY) {
            x = touch.pageX;
            y = touch.pageY;
        } else {
            x = touch.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            y = touch.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }

        var el = frameElement;
        while (el) {
            x -= el.offsetLeft;
            y -= el.offsetTop;
            el = el.offsetParent;
        }

        var pos = vec2.createFloat(x, y);
        return pos;
    }

    function start(event)
    {
        event.preventDefault();
        //if(event.which === 1)
        {
            self.moving = true;
        }
        lastX = event.pageX;
        lastY = event.pageY;
    }
    context.addEventListener('mousedown', start, false);
    context.addEventListener('touchstart', function(event) {
        event.preventDefault();
        var touch = event.changedTouches[0];
        var touchPos = getTouchPosition(touch, context);

        //if(event.which === 1)
        {
            self.moving = true;
        }
        lastX = touchPos[0];
        lastY = touchPos[1];
    }, false);

    function move(event)
    {
        event.preventDefault();
        if(self.moving == true)
        {
            var xDelta = event.pageX-lastX,
                yDelta = event.pageY-lastY;

            lastX = event.pageX;
            lastY = event.pageY;

            var inc = 1;//-Math.PI/360.0;

            self.rotation[0] += inc*yDelta;

            if(self.rotation[0] > 90)
                self.rotation[0] = 90
            else if(self.rotation[0] < -90)
                self.rotation[0] = -90;

            self.rotation[1] += inc*xDelta;
            self.dirty = true;
        }
    }
    context.addEventListener('mousemove', move, false);
    context.addEventListener('touchmove', function(event){
        event.preventDefault();
        var touch = event.changedTouches[0];
        var touchPos = getTouchPosition(touch, context);

        if(self.moving == true)
        {
            var xDelta = touchPos[0]-lastX,
                yDelta = touchPos[1]-lastY;

            lastX = touchPos[0];
            lastY = touchPos[1];

            var inc = 1;//-Math.PI/360.0;

            self.rotation[0] += inc*yDelta;

            if(self.rotation[0] > 90)
                self.rotation[0] = 90
            else if(self.rotation[0] < -90)
                self.rotation[0] = -90;

            console.log(self.rotation[0]);

            self.rotation[1] += inc*xDelta;
            self.dirty = true;
        }
    }, false);

    function end(event)
    {
        event.preventDefault();
        self.moving = false;
        self.dirty = true;
    }
    document.addEventListener('mouseup', end, false);
    document.addEventListener('touchend', end, false);

    context.addEventListener('mousewheel',function(event) {
        event.preventDefault();
    },false);

    context.addEventListener('DOMMouseScroll',function(event) {
        event.preventDefault();
    },false);
};

camera.prototype.getSpeed = function ()
{
    return this.speed;
};
camera.prototype.setSpeed = function (value)
{
    this.speed = value;
};

camera.prototype.getRotation = function ()
{
    return this.rotation;
};
camera.prototype.setRotation = function (value)
{
    this.rotation = vec3.create(value);
    this.dirty = true;
};

camera.prototype.getPosition = function ()
{
    return this.position;
};
camera.prototype.setPosition = function (value)
{
    this.position = vec3.create(value);
    this.dirty = true;
};

camera.prototype.getMat = function ()
{
    var self = this;
    if (self.dirty == true)
    {
        self.viewMatrix = mat4.create();
        mat4.identity(self.viewMatrix);
        mat4.rotateX(self.viewMatrix, degToRad(self.rotation[0]));
        mat4.rotateY(self.viewMatrix, degToRad(self.rotation[1]));
        mat4.rotateZ(self.viewMatrix, degToRad(self.rotation[2]));

        mat4.translate(self.viewMatrix, [-self.position[0], -self.position[1], -self.position[2]]);
        self.dirty = false;
    }

    return mat4.create(self.viewMatrix);
};

camera.prototype.adjustViewPort = function(width, height, projection)
{
    var self = this;
    var aspect = (width / height);
    mat4.perspective(60, aspect, 0.1, 5000, projection);
}

camera.prototype.getFocalLength = function()
{
    return this.focalLength;
};
camera.prototype.setFocalLength = function(value)
{
    var self = this;
    self.focalLength = value;
};

camera.prototype.getFocusDistance = function()
{
    return this.focusDistance;
};
camera.prototype.setFocusDistance = function(value)
{
    var self = this;
    self.focusDistance = value;
};

camera.prototype.getFStop = function()
{
    return this.fStop;
};
camera.prototype.setFStop = function(value)
{
    var self = this;
    self.fStop = value;
};

camera.prototype.getSensorSize = function()
{
    return this.sensorSize;
};
camera.prototype.setSensorSize = function(value)
{
    var self = this;
    self.sensorSize = value;
    self.PPM = Math.sqrt((self.ctxWidth * self.ctxWidth) + (self.ctxHeight * self.ctxHeight)) / self.sensorSize;
};

camera.prototype.getBlurCoefficient = function()
{
    var self = this;
    var ms = self.focalLength / ((self.focusDistance * 1000.0) - self.focalLength);
    self.blurCoefficient = (self.focalLength * ms) / self.fStop;
    return self.blurCoefficient;
};

camera.prototype.update = function(timing)
{
    var self = this;
    var dir = vec3.create();
    var speed = self.speed * (timing.frameTime / 1000); // ~ 1/60
    var rot = 0;
    // Check for speed boost
    if (self.keys[16] == true) // shift key
    {
        speed = (speed * self.boost);
    }
    // Rotate/lean
    if (self.keys['Q'.charCodeAt(0)] == true)
    {
        rot -= Math.PI/5.0;
    }
    else if (this.keys['E'.charCodeAt(0)] == true)
    {
        rot += Math.PI/5.0;
    }

    // This is our first person movement code. It's not really pretty, but it works
    if (self.keys['W'.charCodeAt(0)] == true) {
        dir[2] -= speed;
    }
    if (self.keys['S'.charCodeAt(0)] == true) {
        dir[2] += speed;
    }

    if (self.keys['A'.charCodeAt(0)] == true) {
        dir[0] -= speed;
    }
    if (self.keys['D'.charCodeAt(0)] == true) {
        dir[0] += speed;
    }

    if (self.keys[32] == true) { // Space, moves up
        dir[1] += speed;
    }
    if (self.keys[17] == true) { // Ctrl, moves down
        dir[1] -= speed;
    }

    // Rotate the camera
    if(rot !== 0)
    {
        //this.rotation[2] += rot;

        //var mat = mat4.create();
        //mat4.identity(mat);
        //mat4.rotateZ(mat, degToRad(this.rotation[2]));
        //this.dirty = true;
    }

    // Move the camera in the direction we are facing
    if (dir[0] !== 0 || dir[1] !== 0 || dir[2] !== 0)
    {
        var mat = mat4.create();
        mat4.identity(mat);
        /*
        mat4.rotateX(mat, degToRad(self.rotation[0]));
        mat4.rotateY(mat, degToRad(self.rotation[1]));
        mat4.rotateZ(mat, degToRad(self.rotation[2]));
        mat4.inverse(mat);
        mat4.multiplyVec3(mat, dir);
        */

        //mat4.rotateX(mat, degToRad(self.rotation[0]));
        mat4.rotateY(mat, degToRad(self.rotation[1]));
        mat4.rotateZ(mat, degToRad(self.rotation[2]));
        mat4.inverse(mat);
        mat4.multiplyVec3(mat, dir);

        vec3.add(self.position, dir);
        self.dirty = true;
    }

    //var move = Math.cos(self.moveDelta);
    //self.position[1] += move;
    //console.log(move);

    //if(self.position[1] < self.height)
        //self.position[1] = self.ground + 1.8;

    self.moveDelta += Math.PI/10;
    if(self.moveDelta > Math.PI*2)
        self.moveDelta = 0;
};