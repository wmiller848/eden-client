/*
 *
 */

var actor = function()
{
    var self = this;
    self.name = "default";
    self.model = null;
    self.center = null;
    self.baseRadius = null;
    self.instances = [];
    self.frameTime = 0.0;
};

actor.prototype.init = function(gl, modelURL, name, callback)
{
    var self = this;
    self.name = name;
    //self.model = new model(["aVertexPosition", "aVertexNormal", "aTextureCoord", "aIndex", "aWeightA", "aWeightB", "aBoneA", "aBoneB"]);
    self.model = new model(["aVertexPosition", "aVertexNormal", "aTextureCoord", "aIndex"]);
    self.model.setUrl(gl, modelURL, function(model)
    {
        var size = model.sizeup();
        self.center = size.center;
        self.baseRadius = size.radius;
        if(callback)
            callback();
    });
};

actor.prototype.addInstance = function(iPos, iRot, iScale)
{
    var self = this;

    if(!iPos)
        iPos = vec3.create();

    if(!iRot)
        iRot = vec3.create();

    if(!iScale)
        iScale = vec3.create([1,1,1]);

    var instance = function(p, r, s)
    {
        this.mat = mat4.create();
        this.pos = vec3.create(p);
        this.rot = vec3.create(r);
        this.scale = vec3.create(s);
        this.id = 0;
        this.hidden = false;
        this.center = self.center;
        var avgScale = (s[0]+s[1]+s[2])/3.0;
        this.radius = 8*avgScale;//(self.baseRadius / avgScale) * 2;
        if(this.radius < 5)
            this.radius = 5;

        this.updateMat();
    };

    instance.prototype.setPos = function(v)
    {
        this.pos = vec3.create(v);
        this.updateMat();
    };
    instance.prototype.getPos = function()
    {
        return this.pos;
    };

    instance.prototype.setRot = function(r)
    {
        this.rot = vec3.create(r);
        this.updateMat();
    };
    instance.prototype.getRot = function()
    {
        return this.rot;
    };

    instance.prototype.setScale = function(s)
    {
        this.scale = vec3.create(s);
        var avgScale = (s[0]+s[1]+s[2])/3.0;
        this.radius = 8*avgScale;//(self.baseRadius / avgScale) * 2;
        if(this.radius < 2)
            this.radius = 2;
        this.updateMat();
    };
    instance.prototype.getScale = function()
    {
        return this.scale;
    };

    instance.prototype.updateMat = function()
    {
        var mat = this.mat;
        mat4.identity(mat);

        mat4.translate(mat, this.pos);

        mat4.scale(mat, this.scale);

        mat4.rotateX(mat, degToRad(this.rot[0]));
        mat4.rotateY(mat, degToRad(this.rot[1]));
        mat4.rotateZ(mat, degToRad(this.rot[2]));

    };

    var newInstance = new instance(iPos, iRot, iScale);
    self.instances.push(newInstance);

    console.log("Added Instance");
};

actor.prototype.drawInstances = function(gl, shader, keys, view, projection, frustum, settings)
{
    var self = this;
    gl.useProgram(shader.shaderProgram);
    shader.bindUniforms(gl, ["uPMatrix"],
        [projection]
    );

    if(shader.hasUniform("uMatColor"))
        shader.bindUniforms(gl, ["uMatColor"],
            [1,1,1,1]
        );

    var model = self.model;

    //model.evaluateAnimation(model.rootBones, self.frameTime);
    //shader.bindUniforms(gl, ["uBoneMats"], [model.boneMats]);

    for(var i = 0; i < model.numMeshes; i++)
    {
        model.bindModelData(gl, shader, keys, i);

        for(var j = 0; j < self.instances.length; j++)
        {
            var instance = self.instances[j];

            var pos =  vec3.create();
            mat4.multiplyVec3(instance.mat, instance.center, pos);

            if(mat6x4.sphereInFrustum(frustum, pos, instance.radius))
            {
                if(settings.useLight == false)
                {
                    shader.bindUniforms(gl, ["uModelMatrix", "uViewMatrix", "uUseLighting"],
                        [instance.mat, view, false]
                    );
                }
                else
                {
                    var normMat = mat3.create();
                    mat4.toInverseMat3(instance.mat, normMat);
                    mat3.transpose(normMat);

                    shader.bindUniforms(gl, ["uModelMatrix", "uViewMatrix", "uNMatrix", "uUseLighting"],
                        [instance.mat, view, normMat, true]
                    );
                }

                //if(i == 6)
                model.drawModel(gl, shader, i, "triangles", settings.useTexture);
            }
        }
    }

    self.frameTime += 1;
    if(self.frameTime > (30 * 23.88))
        self.frameTime = 0.0;
};