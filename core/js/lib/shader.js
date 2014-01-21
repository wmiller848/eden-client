var shader = function()
{
    var self = this;
    self.vShader = null;
    self.fShader = null;
    self.shaderProgram = null;

    self.loaded = false;
};

shader.prototype.loadShaders = function(gl, path, attribs, uniforms, callback, options)
{
    var self = this;
    var vShaderFile = path.vsh + '.vsh';
    var fShaderFile = path.fsh + '.fsh';

    function bindAttributes(gl) {
        gl.useProgram(self.shaderProgram);
        // Add any shader attributes and uniforms that we specified needing
        if(attribs)
        {
            self.shaderProgram.attribute = {};
            for(var i in attribs)
            {
                var attrib = attribs[i];
                self.shaderProgram.attribute[attrib] = gl.getAttribLocation(self.shaderProgram, attrib);
                if(self.shaderProgram.attribute[attrib] != -1)
                {
                    //console.log("Shader added attribute: " + attrib);
                    //console.log("Attribute location " + self.shaderProgram.attribute[attrib]);
                }
                else
                {
                    console.log("Attribute " + attrib + " not found");
                    //console.log(self.shaderProgram.attribute[attrib]);
                }
            }
        }
        if(uniforms)
        {
            self.shaderProgram.uniform = {};
            for(var i in uniforms)
            {
                var uniform = uniforms[i];
                self.shaderProgram.uniform[uniform] = gl.getUniformLocation(self.shaderProgram, uniform);
                if(self.shaderProgram.uniform[uniform] != -1)
                {
                    //console.log("Shader added uniform: " + uniform);
                    //console.log("Uniform location " + self.shaderProgram.uniform[uniform]);
                }
                else
                {
                    console.log("Uniform " + uniform + " not found");
                }
            }
        }

        if(callback)
            callback(self);
    }

    function compileShader(gl, vert, frag) {
        if (!frag) { return; }
        if (!vert) { return; }

        self.shaderProgram = gl.createProgram();
        gl.attachShader(self.shaderProgram, vert);
        gl.attachShader(self.shaderProgram, frag);

        gl.linkProgram(self.shaderProgram);


        if (!gl.getProgramParameter(self.shaderProgram, gl.LINK_STATUS)) {
            console.log("Could not initialise shaders");
            return;
        }
        else
        {
            //console.log("Shader compiled");
        }

        bindAttributes(gl);
    }

    // Two assets are being loaded asynchronously: the vertex shader and the
    // fragment shader. The load handlers for both will try to compile the
    // finished shader program - only the second one will succeed.

    // Load the vertex shader
    $.get(vShaderFile, function (source) {
        //console.log(source);
        if(source.split('$#').length > 1)
        {
            var bsource = source.split('$#');
            var src = bsource[0] + options.numBones + bsource[1];
            console.log("DEBUG-SOURCE: \n" + src);
            self.vShader = self.getVShader(gl, src);
            compileShader(gl, self.vShader, self.fShader);

            if (self.shaderProgram) {
                console.log("Loaded shader: " + path);
                self.loaded = true;
            }
        }
        else
        {
            self.vShader = self.getVShader(gl, source);
            compileShader(gl, self.vShader, self.fShader);

            if (self.shaderProgram) {
                console.log("Loaded shader: " + path);
                self.loaded = true;
            }
        }
    }).error(function () {
            console.log("Unable to vShader: " + vShaderFile);
        });

    // Load the fragment shader
    $.get(fShaderFile, function (source) {
        //console.log(source);
        if(source.split('$#').length > 1)
        {
            var bsource = source.split('$#');
            var src = bsource[0] + options.numBones + bsource[1];
            //console.log("DEBUG-SOURCE: \n" + src);
            self.fShader = self.getFShader(gl, src);
            compileShader(gl, self.vShader, self.fShader);

            if (self.shaderProgram) {
                console.log("Loaded shader: " + path);
                self.loaded = true;
            }
        }
        else
        {
            self.fShader = self.getFShader(gl, source);
            compileShader(gl, self.vShader, self.fShader);

            if (self.shaderProgram) {
                console.log("Loaded shader: " + path);
                self.loaded = true;
            }
        }
    }).error(function () {
            console.log("Unable to fShader: " + fShaderFile);
        });
};

shader.prototype.getVShader = function(gl, shaderScript)
{
    var shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, shaderScript);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
};

shader.prototype.getFShader = function(gl, shaderScript)
{
    var shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, shaderScript);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
};

shader.prototype.hasUniform = function(key)
{
    var self = this;
    if (!self.shaderProgram)
        return false;

    if(self.shaderProgram.uniform[key])
    {
        return true;
    }

    return false;
};

shader.prototype.bindUniforms = function(gl, keys, values)
{
    var self = this;
    if (!self.shaderProgram || keys.length != values.length) { return; }

    for(var i = 0; i < keys.length; i++)
    {
        if (self.shaderProgram.uniform[keys[i]] != null)
        {
            var value = values[i];
            if((value == true || value == false) && typeof value != "number")
            {
                gl.uniform1i(self.shaderProgram.uniform[keys[i]], value);
            }
            else if(typeof value == "number")
            {
                gl.uniform1f(self.shaderProgram.uniform[keys[i]], value);
            }
            else if(value.length == 2)
            {
                gl.uniform2f(self.shaderProgram.uniform[keys[i]], value[0], value[1]);
            }
            else if(value.length == 3)
            {
                gl.uniform3f(self.shaderProgram.uniform[keys[i]], value[0], value[1], value[2]);
            }
            else if(value.length == 4)
            {
                gl.uniform4f(self.shaderProgram.uniform[keys[i]], value[0], value[1], value[2], value[3]);
            }
            else if(value.length == 9)
            {
                gl.uniformMatrix3fv(self.shaderProgram.uniform[keys[i]], false, value);
            }
            else if(value.length >= 16)
            {
                gl.uniformMatrix4fv(self.shaderProgram.uniform[keys[i]], false, value);
            }
            else
            {
                console.log("Unknown Uniform");
                console.log(value);
            }
        }
    }
};