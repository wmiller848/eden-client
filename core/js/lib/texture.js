var texture = function () {
    var self = this;
    self.url = 0;
    self.state = 0;
    self.glTexture = 0;
    self.image = new Image();
};

texture.prototype.isLoaded = function () {
    return (this.state === 1);
};

texture.prototype.getUrl = function () {
    return this.url;
};

texture.prototype.setImage = function (gl, image, filtering, textureName) {
    var self = this;
    self.image = image;
    self.url = textureName;

    // Create a WebGLTexture and sampler parameters
    if (gl) {
        self.glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
        if (!self.isPowerOfTwo(self.image.width) || !self.isPowerOfTwo(self.image.height)) {
            // Scale up the texture to the next highest power of two dimensions.
            var canvas = document.createElement("canvas");
            canvas.width = self.nextHighestPowerOfTwo(self.image.width);
            canvas.height = self.nextHighestPowerOfTwo(self.image.height);
            var ctx = canvas.getContext("2d");
            ctx.drawImage(self.image, 0, 0, canvas.width, canvas.height);
            self.image = canvas;
        }
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, self.image);


        var ext = gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
        if(!ext)
            ext = gl.getExtension("EXT_texture_filter_anisotropic");

        if(ext)
            gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, filtering);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);//gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);//gl.LINEAR_MIPMAP_NEAREST);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    self.state = 1;
    //log("Loaded texture: " + textureName);
};

texture.prototype.setUrl = function (gl, url, filtering, callback) {
    var self = this;
    self.url = url;
    self.image.addEventListener("load", function()
    {
        // Create a WebGLTexture and sampler parameters
        if (gl) {
            self.glTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, self.glTexture);
            if (!self.isPowerOfTwo(self.image.width) || !self.isPowerOfTwo(self.image.height)) {
                // Scale up the texture to the next highest power of two dimensions.
                var canvas = document.createElement("canvas");
                canvas.width = self.nextHighestPowerOfTwo(self.image.width);
                canvas.height = self.nextHighestPowerOfTwo(self.image.height);
                var ctx = canvas.getContext("2d");
                ctx.drawImage(self.image, 0, 0, self.image.width, self.image.height);
                self.image = canvas;
            }
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, self.image);

            var ext = gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
            if(!ext)
                ext = gl.getExtension("EXT_texture_filter_anisotropic");

            if(ext && filtering != 0)
                gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, filtering);

            if(filtering != 0)
            {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);//gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);//gl.LINEAR_MIPMAP_NEAREST);
                //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.generateMipmap(gl.TEXTURE_2D);
            }
        }
        self.state = 1;

        console.log("Loaded texture: " + self.url);
        if (callback != null) {
            callback(self);
        }
    });
    self.image.addEventListener("error", function(err)
    {
        console.log(err);
        console.log(self);
        if (callback != null) {
            callback(null);
        }
    });
    self.image.src = url;
};

texture.prototype.bindTexture = function (gl, shader, key) {
    var self = this;
    if (!self.glTexture) {
        //console.log("No Texture found");
        return;
    }

    // Bind this texture to the context as Texture[0]
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, self.glTexture);
    // Bind the shader sampler to this bound texture
    gl.uniform1i(shader.shaderProgram.uniform[key], 0);
};


texture.prototype.isPowerOfTwo = function(x) {
    return (x & (x - 1)) == 0;
};

texture.prototype.nextHighestPowerOfTwo = function(x) {
    --x;
    for (var i = 1; i < 32; i <<= 1) {
        x = x | x >> i;
    }
    return x + 1;
};