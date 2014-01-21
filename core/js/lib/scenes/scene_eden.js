/*
 *
 */

var scene_eden = function()
{
    var self = this;
    self.camera = null;
    self.projection = null;
    self.frustum = null;
    self.context = null;
    self.shaders = null;
    self.frameBuffers = null;

    self.light = [33, 56, 38];
    self.useLight = true;
    self.useSSAO = false;
    self.useTexture = true;

    // -1 <--> 1
    self.brightness = 0.0;
    self.contrast = 1.0;
    // Default Gamma
    self.gamma = 1.8;
    self.renderGamma = true;

    self.map = null;
    self.actors = [];
    self.rNormalTexture = null;
};

scene_eden.prototype.init = function(ctx)
{
    var self = this;

    self.camera = new camera();
    self.camera.init(ctx);
    self.camera.setPosition([0.8,1.8,0]);
    self.camera.setRotation([0,-90,0]);

    // WebGL Spec 1.0 has officially been released
    self.context = ctx.getContext("webgl");
    if(!self.context)
    {
        self.context = ctx.getContext("experimental-webgl");
        if(!self.context)
        {
            // Fail or get getContext('2d)
            alert("Failed to created webgl context");
            return;
        }
    }
    self.context.width = ctx.width;
    self.context.height = ctx.height;

    self.projection = mat4.create();
    self.camera.adjustViewPort(self.context.width, self.context.height, self.projection);

    console.log("Configuring WebGL for Context " + ctx);
    var gl = self.context;
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.viewport(0, 0, self.context.width, self.context.height);
    gl.enable(gl.DEPTH_TEST);
    //gl.cullFace(gl.BACK);

    var shaderProto = function(atrribs, uniforms)
    {
        var self_shader = this;
        self_shader.shader = new shader();
        self_shader.attribs = [];
        self_shader.uniforms = [];

        for(var i in atrribs)
        {
            self_shader.attribs.push(atrribs[i]);
        }
        for(var i in uniforms)
        {
            self_shader.uniforms.push(uniforms[i]);
        }
    };

    // Set Up Shaders
    self.shaders =
    {
        mesh :
        {
            basic : new shaderProto(["aVertexPosition", "aVertexNormal", "aTextureCoord"],
                ["uCameraPos", "uModelMatrix", "uViewMatrix", "uPMatrix", "uNMatrix", "uMaterialShininess",
                    "uUseLighting", "uUseTexture", "uMatColor", "uPointLightingLocation",
                    "uPointLightingSpecularColor", "uPointLightingDiffuseColor", "uPointLightAttenuation",
                    "uPointLightStrength", "uSampler", "uGamma"]),

            animated : new shaderProto(["aVertexPosition", "aVertexNormal", "aTextureCoord", "aWeightA", "aWeightB", "aBoneA", "aBoneB"],
                ["uCameraPos", "uModelMatrix", "uViewMatrix", "uPMatrix", "uNMatrix", "uBoneMats", "uMaterialShininess",
                    "uUseLighting", "uUseTexture", "uMatColor", "uPointLightingLocation",
                    "uPointLightingSpecularColor", "uPointLightingDiffuseColor", "uPointLightAttenuation",
                    "uPointLightStrength", "uSampler", "uGamma"]),

            depth : new shaderProto(["aVertexPosition"], ["uModelMatrix", "uViewMatrix", "uPMatrix", "uNear", "uFar"]),

            position : new shaderProto(["aVertexPosition", "aVertexNormal"], ["uModelMatrix", "uViewMatrix" , "uPMatrix", "uNear", "uFar"]),

            normal : new shaderProto(["aVertexPosition", "aVertexNormal"], ["uModelMatrix", "uViewMatrix", "uPMatrix"])

        },
        texture :
        {
            generic : new shaderProto(["aVertexPosition", "aTextureCoord"], ["uPMatrix", "uSampler0"]),

            depth : new shaderProto(["aVertexPosition", "aTextureCoord"], ["uPMatrix", "uSampler0"]), // visualization

            ssao : new shaderProto(["aVertexPosition", "aTextureCoord"], ["uPMatrix", "uSampler0", "uSampler1", "uSampler2", "uOccluderBias", "uSamplingRadius", "uAttenuation"]),

            ssao_image : new shaderProto(["aVertexPosition", "aTextureCoord"], ["uPMatrix", "uSampler0", "uSampler1"]),

            dof_blur : new shaderProto(["aVertexPosition", "aTextureCoord"], ["uPMatrix", "uTexelSize",
                                        "uSampler0", "uSampler1", "uOrientation", "uBlurCoefficient",
                                        "uFocusDistance", "uNear", "uFar", "uPPM"]),

            dof_image : new shaderProto(["aVertexPosition", "aTextureCoord"], ["uPMatrix",
                                        "uSampler0", "uSampler1", "uSampler2", "uBlurCoefficient",
                                        "uFocusDistance", "uNear", "uFar", "uPPM"]),

            gamma : new shaderProto(["aVertexPosition", "aTextureCoord"], ["uBrightness", "uPMatrix", "uContrast", "uGamma", "uSampler0"])
        }
    };

    //
    // Mesh Shaders
    //
    self.shaders.mesh.basic.shader.loadShaders(gl, {vsh : "core/shaders/DiffuseBasic", fsh : "core/shaders/DiffuseBasic"}, self.shaders.mesh.basic.attribs, self.shaders.mesh.basic.uniforms, function(shader)
    {
        shader.bindUniforms(gl, ["uMaterialShininess", "uUseLighting", "uUseTexture", "uMatColor", "uPointLightingLocation", "uPointLightingSpecularColor",
            "uPointLightingDiffuseColor", "uPointLightAttenuation", "uPointLightStrength", "uGamma"],
            [32, self.useLight, self.useTexture, [1.0,1.0,1.0,1.0], self.light, [1.0,1.0,1.0], [0.25,0.25,0.25], [0.01,0.01,0.01], 200, self.gamma]
        );
    });
    self.shaders.mesh.animated.shader.loadShaders(gl, {vsh : "core/shaders/AnimatedBasic", fsh : "core/shaders/AnimatedBasic"}, self.shaders.mesh.animated.attribs, self.shaders.mesh.animated.uniforms, function(shader)
    {
        shader.bindUniforms(gl, ["uMaterialShininess", "uUseLighting", "uUseTexture", "uMatColor", "uPointLightingLocation", "uPointLightingSpecularColor",
            "uPointLightingDiffuseColor", "uPointLightAttenuation", "uPointLightStrength", "uGamma"],
            [32, self.useLight, self.useTexture, [1.0,1.0,1.0,1.0], self.light, [1.0,1.0,1.0], [0.25,0.25,0.25], [0.01,0.01,0.01], 200, self.gamma]
        );
    }, {numBones : 52});
    self.shaders.mesh.depth.shader.loadShaders(gl, {vsh : "core/shaders/Depth", fsh : "core/shaders/Depth"}, self.shaders.mesh.depth.attribs, self.shaders.mesh.depth.uniforms, function(shader)
    {
        shader.bindUniforms(gl, ["uNear", "uFar"],
            [self.camera.near, self.camera.far]
        );
    });
    self.shaders.mesh.position.shader.loadShaders(gl, {vsh : "core/shaders/Deferred", fsh : "core/shaders/Position"}, self.shaders.mesh.position.attribs, self.shaders.mesh.position.uniforms, function(shader)
    {
        shader.bindUniforms(gl, ["uNear", "uFar"],
            [self.camera.near, self.camera.far]
        );
    });
    self.shaders.mesh.normal.shader.loadShaders(gl, {vsh : "core/shaders/Deferred", fsh : "core/shaders/Normal"}, self.shaders.mesh.normal.attribs, self.shaders.mesh.normal.uniforms, null);

    //
    // Texture Shaders
    //
    self.shaders.texture.generic.shader.loadShaders(gl, {vsh : "core/shaders/Texture_Generic", fsh : "core/shaders/Texture_Generic"}, self.shaders.texture.generic.attribs, self.shaders.texture.generic.uniforms, null);
    self.shaders.texture.depth.shader.loadShaders(gl, {vsh : "core/shaders/Texture_Generic", fsh : "core/shaders/Depth_Image"}, self.shaders.texture.depth.attribs, self.shaders.texture.depth.uniforms, null);
    self.shaders.texture.ssao.shader.loadShaders(gl, {vsh : "core/shaders/Texture_Generic", fsh : "core/shaders/SSAO"}, self.shaders.texture.ssao.attribs, self.shaders.texture.ssao.uniforms, null);
    self.shaders.texture.ssao_image.shader.loadShaders(gl, {vsh : "core/shaders/Texture_Generic", fsh : "core/shaders/SSAO_Image"}, self.shaders.texture.ssao_image.attribs, self.shaders.texture.ssao_image.uniforms, null);
    self.shaders.texture.dof_blur.shader.loadShaders(gl, {vsh : "core/shaders/Texture_Generic", fsh : "core/shaders/DOF_Blur"}, self.shaders.texture.dof_blur.attribs, self.shaders.texture.dof_blur.uniforms, function(shader)
    {
        shader.bindUniforms(gl, ["uBlurCoefficient",
            "uFocusDistance", "uNear", "uFar", "uPPM"],
            [self.camera.getBlurCoefficient(), self.camera.getFocusDistance(), self.camera.near, self.camera.far, self.camera.PPM]
        );
    });
    self.shaders.texture.dof_image.shader.loadShaders(gl, {vsh : "core/shaders/Texture_Generic", fsh : "core/shaders/DOF_Image"}, self.shaders.texture.dof_image.attribs, self.shaders.texture.dof_image.uniforms, function(shader)
    {
        shader.bindUniforms(gl, ["uBlurCoefficient",
            "uFocusDistance", "uNear", "uFar", "uPPM"],
            [self.camera.getBlurCoefficient(), self.camera.getFocusDistance(), self.camera.near, self.camera.far, self.camera.PPM]
        );
    });
    self.shaders.texture.gamma.shader.loadShaders(gl, {vsh : "core/shaders/Texture_Generic", fsh : "core/shaders/Gamma"}, self.shaders.texture.gamma.attribs, self.shaders.texture.gamma.uniforms, function(shader)
    {
        shader.bindUniforms(gl, ["uBrightness",
            "uContrast", "uGamma"],
            [self.brightness, self.contrast, self.gamma]
        );
    });

    var float_texture_ext = gl.getExtension('OES_texture_float');
    // Init frame buffer
    function createFrameBuffer(sizeX, sizeY, format)
    {
        if(!format)
            format = "rgba";

        var frameBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
        frameBuffer.width = sizeX;
        frameBuffer.height = sizeY;

        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        //gl.generateMipmap(gl.TEXTURE_2D);

        if(format == "float" && float_texture_ext)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, frameBuffer.width, frameBuffer.height, 0, gl.RGBA, gl.FLOAT, null);
        else
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, frameBuffer.width, frameBuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        var renderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, frameBuffer.width, frameBuffer.height);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return {frameBuffer : frameBuffer, texture : texture, width : sizeX, height : sizeY};
    };

    self.frameBuffers =
    {
        bitmap : createFrameBuffer(1024, 512),
        depth : createFrameBuffer(1024, 512),
        position : createFrameBuffer(1024, 512, "float"),
        normal : createFrameBuffer(1024, 512, "float"),
        ssao : createFrameBuffer(1024, 512, "float"),
        ssao_blend : createFrameBuffer(1024, 512),
        blur : createFrameBuffer(512, 256),
        dof : createFrameBuffer(1024, 512)
    };

    // Set up Projection Matrix
    self.camera.adjustViewPort(self.context.width,self.context.height, self.projection);

    self.frustum = mat6x4.create();

    var defaultTerrain = function()
    {
        var size = 100.0;
        var vertices =
            [
                -size, 0.0, size,
                size, 0.0, size,
                -size, 0.0, -size,
                size, 0.0, -size
            ];
        this.vertBuffer = gl.createBuffer();
        // Bind Vert buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
        this.vertBuffer.itemSize = 3;
        this.vertBuffer.numItems = vertices.length;

        var normals =
            [
                0,1,0,
                0,1,0,

                0,1,0,
                0,1,0
            ];
        this.normBuffer = gl.createBuffer();
        // Bind Vert buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.DYNAMIC_DRAW);
        this.normBuffer.itemSize = 3;
        this.normBuffer.numItems = normals.length;

        var wrap = size/2;
        var uvs =
            [
                0,0,
                wrap,0,

                0,wrap,
                wrap,wrap
            ];
        this.uvBuffer = gl.createBuffer();
        // Bind Vert buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.DYNAMIC_DRAW);
        this.uvBuffer.itemSize = 2;
        this.uvBuffer.numItems = vertices.length;

        // 'tris'
        var index =
            [
                0,1,2,
                2,1,3
            ];
        // Bind index buffer
        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.DYNAMIC_DRAW);
        this.indexBuffer.itemSize = 1;
        this.indexBuffer.numItems = index.length;
    };

    defaultTerrain.prototype.draw = function(shader, texture, view, proj)
    {
        if(shader.loaded == false)
            return;

        var normMat = mat3.create();
        mat4.toInverseMat3(mat4.identity(mat4.create()), normMat);
        mat3.transpose(normMat);

        gl.useProgram(shader.shaderProgram);
        if(texture)
            texture.bindTexture(gl, shader, "uSampler");

        shader.bindUniforms(gl, ["uModelMatrix", "uViewMatrix", "uPMatrix", "uNMatrix", "uMatColor", "uUseTexture", "uUseLighting", "uCameraPos", "uPointLightingLocation", "uGamma"],
            [mat4.identity(mat4.create()), view, proj, normMat, [1,1,1,1], self.useTexture, self.useLight, self.camera.getPosition(), self.light, self.gamma]
        );

        // vertex buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.vertexAttribPointer(shader.shaderProgram.attribute["aVertexPosition"], this.vertBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.shaderProgram.attribute["aVertexPosition"]);

        // normal buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
        gl.vertexAttribPointer(shader.shaderProgram.attribute["aVertexNormal"], this.normBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.shaderProgram.attribute["aVertexNormal"]);

        // uv buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.vertexAttribPointer(shader.shaderProgram.attribute["aTextureCoord"], this.uvBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.shaderProgram.attribute["aTextureCoord"]);

        // index buffers
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    };

    defaultTerrain.prototype.drawDepth = function(shader, view, proj)
    {
        if(shader.loaded == false)
            return;

        gl.useProgram(shader.shaderProgram);
        shader.bindUniforms(gl, ["uModelMatrix", "uViewMatrix", "uPMatrix"],
            [mat4.identity(mat4.create()), view, proj]
        );

        // vertex buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.vertexAttribPointer(shader.shaderProgram.attribute["aVertexPosition"], this.vertBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.shaderProgram.attribute["aVertexPosition"]);

        // index buffers
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    };

    defaultTerrain.prototype.drawNormal = function(shader, view, proj)
    {
        if(shader.loaded == false)
            return;

        gl.useProgram(shader.shaderProgram);

        var modelMat = mat4.create();
        mat4.identity(modelMat);

        shader.bindUniforms(gl, ["uModelMatrix", "uViewMatrix", "uPMatrix"],
            [modelMat, view, proj]
        );

        // vertex buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.vertexAttribPointer(shader.shaderProgram.attribute["aVertexPosition"], this.vertBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.shaderProgram.attribute["aVertexPosition"]);

        // normal buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
        gl.vertexAttribPointer(shader.shaderProgram.attribute["aVertexNormal"], this.normBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.shaderProgram.attribute["aVertexNormal"]);

        // index buffers
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    };

    defaultTerrain.prototype.drawPosition = function(shader, view, proj)
    {
        if(shader.loaded == false)
            return;

        gl.useProgram(shader.shaderProgram);

        var modelMat = mat4.create();
        mat4.identity(modelMat);

        shader.bindUniforms(gl, ["uModelMatrix", "uViewMatrix", "uPMatrix"],
            [modelMat, view, proj]
        );

        // vertex buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.vertexAttribPointer(shader.shaderProgram.attribute["aVertexPosition"], this.vertBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.shaderProgram.attribute["aVertexPosition"]);

        // normal buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
        gl.vertexAttribPointer(shader.shaderProgram.attribute["aVertexNormal"], this.normBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.shaderProgram.attribute["aVertexNormal"]);

        // index buffers
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    };

    // Init default map
    self.map =
    {
        texture : new texture(),
        terrain :
        {
            default : new defaultTerrain(),
            current : null
        }
    };

    self.map.texture.setUrl(gl, "core/assets/maps/tile_stone.jpg", 64, null);
    self.rNormalTexture = new texture();
    self.rNormalTexture.setUrl(gl, "core/assets/lighting/randomNormal.jpg", 4, null)

    // Set up actors
    /*
    var apple = new actor();
    apple.init(gl, "core/assets/doodads/apple/apple.json", function()
    {
        apple.addInstance([0,0,0], [0,0,0], [0.01,0.01,0.01]);
        self.actors.push(apple);
    });
    */

    var robbie = new actor();
    robbie.init(gl, "core/assets/characters/robbie/robbie.json", "Robbie", function()
    {
		console.log(robbie);
        var startA = vec3.create([-2, 0, 95]);
        for(var j = 0; j < 20; j++)
        {
            robbie.addInstance(startA, [-90,0,0], [1,1,1]);
            //startA[0] += 10;
            startA[2] -= 10;
        }

        startA = vec3.create([2, 0, 100]);
        for(var j = 0; j < 20; j++)
        {
            robbie.addInstance(startA, [90,180,0], [2,2,2]);
            //startA[0] += 10;
            startA[2] -= 10;
        }
        self.actors.push(robbie);
    });


    var kerrigan = new actor();
    kerrigan.init(gl, "core/assets/characters/Kerrigan_infested/Kerrigan_infested.json", "Kerrigan", function()
    {
    	console.log(kerrigan);
        var startB = vec3.create([-5, 0, 95]);
        for(var j = 0; j < 10; j++)
        {
            kerrigan.addInstance(startB, [0,0,0], [2,2,2]);
            //startB[0] += 10;
            startB[2] -= 20;
        }

        startB = vec3.create([5, 0, 100]);
        for(var j = 0; j < 10; j++)
        {
            kerrigan.addInstance(startB, [0,180,0], [0.6,0.6,0.6]);
            //startB[0] += 10;
            startB[2] -= 20;
        }
        self.actors.push(kerrigan);
    });


    var skybox = new actor();
    skybox.init(gl, "core/assets/lighting/skybox/skybox.json", "Skybox", function()
    {
        console.log(skybox);
        var scale = 1000.0;
        skybox.addInstance([0,0,0], [0,0,0], [scale,scale,scale]);
        self.actors.push(skybox);
    });

    var cortana = new actor();
    cortana.init(gl, "core/assets/characters/cortana/cortanaV2.json", "Cortana", function()
    {
        console.log(cortana);
        cortana.addInstance([0,0,0], [0,0,0], [0.035,0.035,0.035]);
        self.actors.push(cortana);
    });


    // Init Dev UI
    $("#lightPosX").slider({
        min: -200,
        max: 200,
        value : self.light[0],
        step : 0.5,
        slide : function(evt, ui)
        {
            self.light[0] = ui.value;
        }
    });
    $("#lightPosY").slider({
        min: 0,
        max: 200,
        value : self.light[1],
        step : 0.5,
        slide : function(evt, ui)
        {
            self.light[1] = ui.value;
        }
    });
    $("#lightPosZ").slider({
        min: -200,
        max: 200,
        value : self.light[2],
        step : 0.5,
        slide : function(evt, ui)
        {
            self.light[2] = ui.value;
        }
    });

    // Camera Settings
    $("#focalLength").slider({
        min: 0,
        max: 200,
        value : 100,
        step : 1.0,
        slide : function(evt, ui)
        {
           self.camera.setFocalLength(ui.value);
        }
    });
    $("#focalDistance").slider({
        min: self.camera.near,
        max: self.camera.far,
        value : 10,
        step : 0.1,
        slide : function(evt, ui)
        {
            self.camera.setFocusDistance(ui.value);
        }
    });
    $("#fStop").slider({
        min: 1.4,
        max: 16,
        value : 1.4,
        step : 0.2,
        slide : function(evt, ui)
        {
            self.camera.setFStop(ui.value);
        }
    });

    // Display Settings
    $("#brightness").slider({
        min: -1,
        max: 1,
        value : 0,
        step : 0.1,
        slide : function(evt, ui)
        {
            self.brightness = ui.value;
        }
    });
    $("#contrast").slider({
        min: -1,
        max: 1,
        value : 1,
        step : 0.1,
        slide : function(evt, ui)
        {
            self.contrast = ui.value;
        }
    });
    $("#gammaScreen").slider({
        min: 1.0,
        max: 2.6,
        value : self.gamma, // mac book pro
        step : 0.1,
        slide : function(evt, ui)
        {
            self.gamma = ui.value;
        }
    });

    var textureOnOff = $("input[name=useTexture]");
    textureOnOff.change(function()
    {
        self.useTexture = !self.useTexture;
    });

    var lightOnOff = $("input[name=useLight]");
    lightOnOff.change(function()
    {
        self.useLight = !self.useLight;
    });

    var ssaoOnOff = $("input[name=useSSAO]");
    ssaoOnOff.change(function()
    {
        self.useSSAO = !self.useSSAO;
    });

    var gammaOnOff = $("input[name=useGamma]");
    gammaOnOff.change(function()
    {
        self.renderGamma = !self.renderGamma;
    });
};

scene_eden.prototype.loadPlayer = function()
{

};

scene_eden.prototype.addNetworkUser = function()
{

};

scene_eden.prototype.addNPC = function()
{

};

scene_eden.prototype.render = function(timing)
{
    var self = this;

    var gl = self.context;

    var bitmapFrameBuffer = self.frameBuffers.bitmap;
    gl.bindFramebuffer(gl.FRAMEBUFFER, bitmapFrameBuffer.frameBuffer);
    gl.viewport(0, 0, bitmapFrameBuffer.width, bitmapFrameBuffer.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    var view = self.camera.getMat();
    var proj = self.projection;
    var invProj = mat3.create();
    mat4.toInverseMat3(proj, invProj);

    var frustum = self.frustum;
    mat6x4.frustum(proj, view, frustum);

    var texture = self.map.texture;
    var shader = self.shaders.mesh.basic.shader;

    // Render Diffuse + direct lighting
    self.map.terrain.default.draw(shader, texture, view, proj);

    // Skybox
    if(self.actors[0])
        self.actors[0].drawInstances(gl, shader, ["aVertexPosition", "aVertexNormal", "aTextureCoord"], view, proj, frustum, {useLight : false, useTexture : true, timing : timing});

    //shader = self.shaders.mesh.animated.shader;
    shader = self.shaders.mesh.basic.shader;
    gl.useProgram(shader.shaderProgram);
    shader.bindUniforms(gl, ["uCameraPos", "uPointLightingLocation", "uGamma"],
        [self.camera.getPosition(), self.light, self.gamma]
    );
    for(var i = 1; i < self.actors.length; i++)
    {
        //self.actors[i].drawInstances(gl, shader, ["aVertexPosition", "aVertexNormal", "aTextureCoord", "aWeightA", "aWeightB", "aBoneA", "aBoneB"], view, proj, frustum, {useLight : self.useLight, useTexture : self.useTexture, timing : timing});
        self.actors[i].drawInstances(gl, shader, ["aVertexPosition", "aVertexNormal", "aTextureCoord"], view, proj, frustum, {useLight : self.useLight, useTexture : self.useTexture, timing : timing});
    }

    // Render Depth
    var depthFrameBuffer = self.frameBuffers.depth;
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFrameBuffer.frameBuffer);
    gl.viewport(0, 0, depthFrameBuffer.width, depthFrameBuffer.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    shader = self.shaders.mesh.depth.shader;
    self.map.terrain.default.drawDepth(shader, view, proj);

    for(var i = 0; i < self.actors.length; i++)
    {
        self.actors[i].drawInstances(gl, shader, ["aVertexPosition"], view, proj, frustum, {useLight : false, useTexture : false, timing : timing});
    }

    // Render Normal
    var normalFrameBuffer = self.frameBuffers.normal;
    if(self.useSSAO == true)
    {
        gl.bindFramebuffer(gl.FRAMEBUFFER, normalFrameBuffer.frameBuffer);
        gl.viewport(0, 0, normalFrameBuffer.width, normalFrameBuffer.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        shader = self.shaders.mesh.normal.shader;
        self.map.terrain.default.drawNormal(shader, view, proj);

        for(var i = 0; i < self.actors.length; i++)
        {
            self.actors[i].drawInstances(gl, shader, ["aVertexPosition", "aVertexNormal"], view, proj, frustum, {useLight : false, useTexture : false, timing : timing});
        }
    }

    // Render Position
    var positionFrameBuffer = self.frameBuffers.position;
    if(self.useSSAO == true)
    {
        gl.bindFramebuffer(gl.FRAMEBUFFER, positionFrameBuffer.frameBuffer);
        gl.viewport(0, 0, positionFrameBuffer.width, positionFrameBuffer.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        shader = self.shaders.mesh.position.shader;
        self.map.terrain.default.drawPosition(shader, view, proj);

        for(var i = 0; i < self.actors.length; i++)
        {
            self.actors[i].drawInstances(gl, shader, ["aVertexPosition", "aVertexNormal"], view, proj, frustum, {useLight : false, useTexture : false, timing : timing});
        }
    }

    // Bitmap buffers
    var vertBuffer = gl.createBuffer();
    var uvBuffer = gl.createBuffer();
    var indexBuffer = gl.createBuffer();

    function renderBitmap(frameBuffer, shader, textures, keys, values)
    {
        if(!shader.loaded)
            return;

        if(!frameBuffer)
            frameBuffer = {frameBuffer : null, width : gl.width, height : gl.height};

        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer.frameBuffer);
        gl.viewport(0, 0, frameBuffer.width, frameBuffer.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Fill buffers
        {
            var vertices =
                [
                    0, 0, 0.0,
                    frameBuffer.width, 0, 0.0,
                    0, frameBuffer.height, 0.0,
                    frameBuffer.width, frameBuffer.height, 0.0
                ];
            // Bind Vert buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
            vertBuffer.itemSize = 3;
            vertBuffer.numItems = vertices.length;

            var textureCoords =
                [
                    0.0, 0.0,
                    1.0, 0.0,
                    0.0, 1.0,
                    1.0, 1.0
                ];
            // Bind UV buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.DYNAMIC_DRAW);
            uvBuffer.itemSize = 2;
            uvBuffer.numItems = textureCoords.length;

            // 'square'
            var index =
                [
                    0,1,2,
                    2,1,3
                ];
            // Bind index buffer
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.DYNAMIC_DRAW);
            indexBuffer.itemSize = 1;
            indexBuffer.numItems = index.length;
        }

        var ortho = mat4.create();
        mat4.ortho(0, frameBuffer.width, 0, frameBuffer.height, -1, 1, ortho);

        gl.useProgram(shader.shaderProgram);
        // vertex buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
        gl.vertexAttribPointer(shader.shaderProgram.attribute["aVertexPosition"], vertBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.shaderProgram.attribute["aVertexPosition"]);

        // uv buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.vertexAttribPointer(shader.shaderProgram.attribute["aTextureCoord"], uvBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.shaderProgram.attribute["aTextureCoord"]);

        if(textures)
        {
            for(var j = 0; j < textures.length; j++)
            {
                if(!textures[j])
                    return;

                gl.activeTexture(gl['TEXTURE'+j]);
                gl.uniform1i(shader.shaderProgram.uniform['uSampler'+j], j);
                gl.bindTexture(gl.TEXTURE_2D, textures[j]);
            }
        }

        shader.bindUniforms(gl, ["uPMatrix"], [ortho]);

        if(keys && values)
            shader.bindUniforms(gl, keys, values);

        // index buffers
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.drawElements(gl.TRIANGLES, indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }

    // Render SSAO

    var ssaoFrameBuffer = self.frameBuffers.ssao;
    var ssaoBlendFrameBuffer = self.frameBuffers.ssao_blend;
    shader = self.shaders.texture.ssao.shader;

    var texX = 1/bitmapFrameBuffer.width;
    var texY = 1/bitmapFrameBuffer.height;

    if(self.useSSAO == true)
    {
        renderBitmap(ssaoFrameBuffer, shader, [positionFrameBuffer.texture, normalFrameBuffer.texture, self.rNormalTexture.glTexture], ["uTexelSize", "uOccluderBias", "uSamplingRadius", "uAttenuation"], [[texX, texY], 0.05, 20, [1, 5]]);

        shader = self.shaders.texture.ssao_image.shader;
        renderBitmap(ssaoBlendFrameBuffer, shader, [bitmapFrameBuffer.texture, ssaoFrameBuffer.texture], null, null);
    }
    else
    {
        ssaoBlendFrameBuffer = bitmapFrameBuffer;
    }

    // Render blur
    var blurFrameBuffer = self.frameBuffers.blur;
    shader = self.shaders.texture.dof_blur.shader;

    var blurCoefficient = self.camera.getBlurCoefficient();

    // Horizontal
    renderBitmap(blurFrameBuffer, shader, [ssaoBlendFrameBuffer.texture, depthFrameBuffer.texture],
                ["uTexelSize", "uOrientation", "uBlurCoefficient", "uFocusDistance", "uPPM", "uNear", "uFar"],
                [[texX, texY], false, blurCoefficient, self.camera.getFocusDistance(), self.camera.PPM, self.camera.near, self.camera.far]);

    // Vertical
    renderBitmap(blurFrameBuffer, shader, [bitmapFrameBuffer.texture, depthFrameBuffer.texture],
        ["uTexelSize", "uOrientation", "uBlurCoefficient", "uFocusDistance", "uPPM", "uNear", "uFar"],
        [[texX, texY], true, blurCoefficient, self.camera.getFocusDistance(), self.camera.PPM, self.camera.near, self.camera.far]);

    // Blend & output to canvas
    var dofFrameBuffer = self.frameBuffers.dof;
    shader = self.shaders.texture.dof_image.shader;

    if(self.renderGamma == false)
    {
        renderBitmap(null, shader, [bitmapFrameBuffer.texture, depthFrameBuffer.texture, blurFrameBuffer.texture], ["uBlurCoefficient", "uFocusDistance", "uPPM", "uNear", "uFar"],
            [blurCoefficient, self.camera.getFocusDistance(), self.camera.PPM, self.camera.near, self.camera.far]);
    }
    else
    {
        // apply gamma before rendering
        renderBitmap(dofFrameBuffer, shader, [bitmapFrameBuffer.texture, depthFrameBuffer.texture, blurFrameBuffer.texture], ["uBlurCoefficient", "uFocusDistance", "uPPM", "uNear", "uFar"],
            [blurCoefficient, self.camera.getFocusDistance(), self.camera.PPM, self.camera.near, self.camera.far]);

        shader = self.shaders.texture.gamma.shader;
        renderBitmap(null, shader, [dofFrameBuffer.texture], ["uBrightness", "uContrast", "uGamma"],
            [self.brightness, self.contrast, self.gamma]);
    }

    //shader = self.shaders.texture.gamma.shader;
    //renderBitmap(null, shader, [ssaoBlendFrameBuffer.texture], ["uBrightness", "uContrast", "uGamma"],
    //    [self.brightness, self.contrast, self.gamma]);
};

scene_eden.prototype.update = function(timing)
{
    var self = this;
    self.camera.update(timing);
};