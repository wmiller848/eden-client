/*
 *  William Miller
 *
 */

var model = function(keys)
{
    var self = this;
    self.url = 0;
    self.state = 0;
    self.texCoords = false;
    self.data = {};

    self.buffers = {};
    self.buffers[keys[0]] = null; // Verts
    self.buffers[keys[1]] = null; // Normals
    self.buffers[keys[2]] = null; // UVs
    self.buffers[keys[3]] = null; // Indicies
    self.buffers[keys[4]] = null; // WeightA
    self.buffers[keys[5]] = null; // WeightB
    self.buffers[keys[6]] = null; // BoneA
    self.buffers[keys[7]] = null; // BoneB
    self.keys = keys;

    self.textures = [];
    self.rootBones = null;
    self.boneMap = [];
    self.boneMats = [];
    self.animations = null;
    self.lastAnimationTime = -1;
    self.animationTicker = 0;
    self.numMeshes = 0;
};

model.prototype.isLoaded = function() {
    var self = this;
    return (self.state === 1);
};

model.prototype.getUrl = function() {
    var self = this;
    return self.url;
};

model.prototype.loadAnimation = function()
{
    var self = this;
    self.animations = self.data.mAnimations;
    self.rootBones = self.data.mRootBones;
    self.boneMats = new Float32Array(16 * 75); // 16 float matrix * max bones
    self.buildBoneMap(self.rootBones, self.boneMap, 0);
};

model.prototype.evaluateAnimation = function(node, animationTime)
{
    var self = this;
    if(self.animations == null)
        return;

    //console.log(self.animations);
    if(self.lastAnimationTime != animationTime)
    {
        var globalInverse = mat4.identity(mat4.create());
        mat4.inverse(globalInverse);

        function evaluate(n, p)
        {
                var frames = self.animations[self.animationTicker];
                if(frames)
                {
                    //console.log("Animation for bone " + n.name);
                    var c = self.searchBoneMap(n.name);
                    var t = frames.indexOf(n.name);
                    //console.log([c,t]);
                    var nodeMat = mat4.create(
                        [
                            frames[t+12], frames[t+13], frames[t+14], frames[t+15],
                            frames[t+16], frames[t+17], frames[t+18], frames[t+19],
                            frames[t+20], frames[t+21], frames[t+22], frames[t+23],
                            frames[t+24], frames[t+25], frames[t+26], frames[t+27]
                        ]);

                    if(t > -1)
                    {
                        // Apply the parent transform to this bone
                        var bonePos = vec3.create([frames[t+9],frames[t+10],frames[t+11]]);
                        var boneRot = quat4.create([frames[t+5],frames[t+6],frames[t+7],frames[t+8]]);
                        var boneMat = mat4.fromRotationTranslation(boneRot, bonePos);
                        mat4.multiply(boneMat, nodeMat, nodeMat);
                    }

                    var globalTransform = mat4.identity(mat4.create());
                    mat4.multiply(p.transform, nodeMat, globalTransform);

                    if(c > -1)
                    {
                        var globalOffset = mat4.create();
                        mat4.identity(globalOffset);
                        mat4.multiply(globalTransform, self.boneMap[c].offsetMatrix, globalOffset);

                        var finalTrans = mat4.create();
                        mat4.identity(finalTrans);
                        mat4.multiply(globalOffset, globalInverse, finalTrans);
                        var q = c*16;
                        self.boneMats.set(finalTrans, q);
                    }

                    for(var u = 0; u < n.zChildren.length; u++)
                    {
                        evaluate(n.zChildren[u], {transform : mat4.create(globalTransform)});
                    }
                }
        }

        evaluate(node, {pos : vec3.create(), rot : quat4.create([1,1,1,1]), transform : mat4.identity(mat4.create())});
        self.animationTicker++;
        self.lastAnimationTime = animationTime;

        if(self.animationTicker > self.animations.length-1)
            self.animationTicker = 0;
    }
};

model.prototype.buildBoneMap = function(node, boneMap, t)
{
    var self = this;

    if(node)
    {
        if(node.name != "RootNode"
                    && node.name != "Mesh1" && node.name != "Mesh2"
                    && node.name != "Mesh3" && node.name != "Mesh4"
                    && node.name != "Mesh5" && node.name != "Mesh6"
                    && node.name != "Mesh7" && node.name != "Mesh8" && node.name != "Mesh9")
        {
            boneMap.push({key : node.name, index : t, offsetMatrix : mat4.identity(mat4.create())});

            console.log("BoneMap - Index " + t + " Name " + node.name);
            t++;
        }

        for(var u = 0; u < node.zChildren.length; u++)
        {
            self.buildBoneMap(node.zChildren[u], boneMap, t+u);
        }
    }
};

model.prototype.searchBoneMap = function(key)
{
    if(key == "default")
        return -1;

    var self = this;
    for(var z = 0; z < self.boneMap.length; z++)
    {
        if(key == self.boneMap[z].key)
            return self.boneMap[z].index;
    }

    //console.log("No matching bone found");
    return -1;
};


model.prototype.bindData = function(gl)
{
    var self = this;
    if (gl) {


        var keys = self.keys;

        var vertKey = keys[0];
        var normKey = keys[1];
        var texKey = keys[2];
        var indexKey = keys[3];
        var weightAKey = keys[4];
        var weightBKey = keys[5];
        var boneAKey = keys[6];
        var boneBKey = keys[7];

        self.buffers[vertKey] = [];
        self.buffers[normKey] = [];
        self.buffers[texKey] = [];
        self.buffers[indexKey] = [];
        self.buffers[weightAKey] = [];
        self.buffers[weightBKey] = [];
        self.buffers[boneAKey] = [];
        self.buffers[boneBKey] = [];

        //self.loadAnimation();

        for (var count = 0; count < self.data.mModels.length; count++)
        {
            var mesh = self.data.mModels[count];
			/*
            var acceptedBoneIndexesA = [];
            var acceptedBoneIndexesB = [];
            var acceptedWeightsA = [];
            var acceptedWeightsB = [];
            */
            
			/*
            if(mesh.mWeights)
            {
                //var b = 0;
                for(var t = 0; t < mesh.mWeights.length; t++)
                {
                    var weight = mesh.mWeights[t];
                    for(var u = 0; u < 5; u++)
                    {
                        if(u < 3)
                        {
                            acceptedBoneIndexesA.push(self.searchBoneMap(weight["key"+(u+1)]));
                            acceptedWeightsA.push(weight["weight"+(u+1)]);
                        }
                        else
                        {
                            acceptedBoneIndexesB.push(self.searchBoneMap(weight["key"+(u+1)]));
                            acceptedWeightsB.push(weight["weight"+(u+1)]);
                        }
                    }

                    var q = 0;
                    for(var u = 0; u < 5; u++)
                    {
                        function checkWeight(w, k)
                        {
                            if(!w || !k)
                                return;

                            var r = b % 3;
                            //console.log([r, w, k]);
                            if(r == 0)
                            {
                                if(!acceptedWeights[b] || w > acceptedWeights[b])
                                {
                                    acceptedBoneIndexes[b] = self.searchBoneMap(k);
                                    acceptedWeights[b] = w;

                                    // DEBUG
                                    //acceptedBoneIndexes[b] = 0;
                                    //acceptedWeights[b] = 0.33333;

                                    if(q < 3)
                                    {
                                        b++;
                                        q++;
                                    }
                                }
                            }
                            else if(r == 1)
                            {
                                if(!acceptedWeights[b-1] || w > acceptedWeights[b-1])
                                {
                                    acceptedBoneIndexes[b-1] = self.searchBoneMap(k);
                                    acceptedWeights[b-1] = w;

                                    // DEBUG
                                    //acceptedBoneIndexes[b] = 0;
                                    //acceptedWeights[b] = 0.33333;

                                    if(q < 3)
                                    {
                                        b++;
                                        q++;
                                    }
                                }
                                else if(!acceptedWeights[b] ||w > acceptedWeights[b])
                                {
                                    acceptedBoneIndexes[b] = self.searchBoneMap(k);
                                    acceptedWeights[b] = w;

                                    // DEBUG
                                    //acceptedBoneIndexes[b] = 0;
                                    //acceptedWeights[b] = 0.33333;

                                    if(q < 3)
                                    {
                                        b++;
                                        q++;
                                    }
                                }
                            }
                            else if(r == 2)
                            {
                                if(!acceptedWeights[b-2] || w > acceptedWeights[b-2])
                                {
                                    acceptedBoneIndexes[b-2] = self.searchBoneMap(k);
                                    acceptedWeights[b-2] = w;

                                    // DEBUG
                                    //acceptedBoneIndexes[b] = 0;
                                    //acceptedWeights[b] = 0.33333;

                                    if(q < 3)
                                    {
                                        b++;
                                        q++;
                                    }
                                }
                                else if(!acceptedWeights[b-1] || w > acceptedWeights[b-1])
                                {
                                    acceptedBoneIndexes[b-1] = self.searchBoneMap(k);
                                    acceptedWeights[b-1] = w;

                                    // DEBUG
                                    //acceptedBoneIndexes[b] = 0;
                                    //acceptedWeights[b] = 0.33333;

                                    if(q < 3)
                                    {
                                        b++;
                                        q++;
                                    }
                                }
                                else if(!acceptedWeights[b] || w > acceptedWeights[b])
                                {
                                    acceptedBoneIndexes[b] = self.searchBoneMap(k);
                                    acceptedWeights[b] = w;

                                    // DEBUG
                                    //acceptedBoneIndexes[b] = 0;
                                    //acceptedWeights[b] = 0.33333;

                                    if(q < 3)
                                    {
                                        b++;
                                        q++;
                                    }
                                }
                            }
                        }

                        var weight = mesh.mWeights[t];
                        checkWeight(weight["weight"+(u+1)], weight["key"+(u+1)]);
                    }
                    
                    while(q < 3)
                    {
                        acceptedBoneIndexes[b] = -1;
                        acceptedWeights[b] = 0.0;

                        // DEBUG
                        //acceptedBoneIndexes[b] = 0;
                        //acceptedWeights[b] = 0.33333;

                        b++;
                        q++;
                    }
                    var weightCheck = acceptedWeightsA[acceptedWeightsA.length-3] + acceptedWeightsA[acceptedWeightsA.length-2] + acceptedWeightsA[acceptedWeightsA.length-1]
                                    + acceptedWeightsB[acceptedWeightsB.length-2] + acceptedWeightsB[acceptedWeightsB.length-1];

                    // Soft equal, ~1.0
                    if(weightCheck < 0.98 || weightCheck > 1.02)
                    {
                        console.log("WARNING - Weight check failed " + weightCheck);
                        //console.log(mesh.mWeights[t]);
                    }
                    else
                    {
                        //console.log("Weight check - " + weightCheck);
                    }
                }
            }

            if(mesh.mBones)
            {
                for(var i = 0; i < mesh.mBones.length; i++)
                {
                    var c = self.searchBoneMap(mesh.mBones[i].name);
                    self.boneMap[c].offsetMatrix = mat4.create(mesh.mBones[i].offsetMatrix);
                }
            }
			*/
			
			/*
            console.log("Bone Index A " + acceptedBoneIndexesA.length/3);
            console.log("Bone Index B " + acceptedBoneIndexesB.length/2);
            console.log("Weight A " + acceptedWeightsA.length/3);
            console.log("Weight B " + acceptedWeightsB.length/2);

            console.log("Vertex Length " + mesh.mVerticies.length/3);


            if((acceptedWeightsA.length/3 != mesh.mVerticies.length/3 || acceptedWeightsB.length/2 != mesh.mVerticies.length/3) && mesh.mWeights)
                console.log("WARNING - animation weights of unexpected length - expected " + mesh.mVerticies.length/3 + ", received - " + acceptedWeightsA.length/3 + " & " + acceptedWeightsB.length/2);

            var weightIndexBufferA = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, weightIndexBufferA);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(acceptedBoneIndexesA), gl.STATIC_DRAW);
            weightIndexBufferA.itemSize = 3;
            weightIndexBufferA.numItems = acceptedBoneIndexesA.length/3;
            self.buffers[boneAKey].push(weightIndexBufferA);

            var weightIndexBufferB = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, weightIndexBufferB);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(acceptedBoneIndexesB), gl.STATIC_DRAW);
            weightIndexBufferB.itemSize = 2;
            weightIndexBufferB.numItems = acceptedBoneIndexesB.length/2;
            self.buffers[boneBKey].push(weightIndexBufferB);

            var weightBufferA = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, weightBufferA);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(acceptedWeightsA), gl.STATIC_DRAW);
            weightBufferA.itemSize = 3;
            weightBufferA.numItems = acceptedWeightsA.length/3;
            self.buffers[weightAKey].push(weightBufferA);

            var weightBufferB = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, weightBufferB);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(acceptedWeightsB), gl.STATIC_DRAW);
            weightBufferB.itemSize = 2;
            weightBufferB.numItems = acceptedWeightsB.length/2;
            self.buffers[weightBKey].push(weightBufferB);
			*/
            var vertBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.mVerticies), gl.STATIC_DRAW);
            vertBuffer.itemSize = 3;
            vertBuffer.numItems = mesh.mVerticies.length/3;
            self.buffers[vertKey].push(vertBuffer);

            if(mesh.mNormals)
            {
                var normBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.mNormals), gl.STATIC_DRAW);
                normBuffer.itemSize = 3;
                normBuffer.numItems = mesh.mNormals.length/3;
                self.buffers[normKey].push(normBuffer);
            }

            // Texture coords buffer is optional, as model may have no texcoords defined
            for(var i = 0; i < 8; i++)
            {
                if(mesh["mUV"+i] != null)
                {
                    if(self.texCoords == false)
                        self.texCoords = true;

                    var textBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, textBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh["mUV"+i]), gl.STATIC_DRAW);
                    textBuffer.itemSize = 2;
                    textBuffer.numItems = mesh["mUV"+i].length/2;
                    self.buffers[texKey].push(textBuffer);
                }
            }

            if(mesh.mIndices != null)
            {
                var indexBuffer  = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.mIndices), gl.STATIC_DRAW);
                indexBuffer.itemSize = 1;
                indexBuffer.numItems = mesh.mIndices.length;
                self.buffers[indexKey].push(indexBuffer);
            }

            if(self.texCoords == true)
            {
                var texture_diffuse = new texture();
                var path = self.url.split('/');
                var textureURL = "";
                for(var i = 0; i < path.length-1; i++)
                {
                    textureURL += path[i] + '/';
                }
                if(mesh.mTexture.diffuse == "")
                    textureURL = "core/assets/default/default.png";
                else
                    textureURL += mesh.mTexture.diffuse;

                texture_diffuse.setUrl(gl, textureURL, 4, null);
                self.textures.push(texture_diffuse);
            }
            self.numMeshes++;
        }
        //self.evaluateAnimation(self.rootBones, 0.0);
        self.state = 1;
    }
};

model.prototype.hasTexcoords = function()
{
    var self = this;
    if (self.state === 0) {
        return false;
    }
    return self.texCoords;
};

model.prototype.numModels = function()
{
    var self = this;
    if (self.state === 0) {
        return 0;
    }
    return (self.data.mModels.length);
};

model.prototype.setData = function(gl, data, modelName)
{
    var self = this;
    self.url = modelName;
    self.data = data;
    self.state = 0;
    self.bindData(gl);
    console.log("Loaded model: " + modelName);
};

model.prototype.setUrl = function(gl, url, callback)
{
    var self = this;
    self.url = url;
    self.state = 0;

    var d = new Date();
    var modelDataFile = url + "?" + d.getTime();

    $.get(modelDataFile, function (modelData)
    {
        // on the web site, it just returns an object
        // locally under MAMP, it returns a JSON object
        if (typeof modelData !== 'object')
        {
            modelData = JSON.parse(modelData);
        }
        self.data = modelData;
        self.bindData(gl);

        if (callback != null)
        {
            callback(self);
        }

        console.log("Loaded model: " + self.url);
    }).error(function () {
        console.log("Unable to load model: " + self.url);
    });
};

model.prototype.sizeup = function()
{
    var self = this;

    var vertices = [];
    for(var i  = 0; i < self.data.mModels.length; i++)
    {
        var verts = self.data.mModels[i].mVerticies;
        for(var i = 0; i < verts.length; i+=3)
        {
            vertices.push(verts[i+0]);
            vertices.push(verts[i+1]);
            vertices.push(verts[i+2]);
        }
    }

    var min = vec3.create([9999, 9999, 9999]);
    var max = vec3.create([-9999, -9999, -9999]);

    var length = vertices.length;
    var x = 0, y = 0, z  = 0;

    for(var i = 0; i < length; i+=3)
    {
        x += vertices[i+0];
        y += vertices[i+1];
        z += vertices[i+2];

        if (vertices[i+0] > max[0])
            max[0] = vertices[i+0];
        if (vertices[i+1] > max[1])
            max[1] = vertices[i+1];
        if (vertices[i+2] > max[2])
            max[2] = vertices[i+2];

        if (vertices[i+0] < min[0])
            min[0] = vertices[i+0];
        if (vertices[i+1] < min[1])
            min[1] = vertices[i+1];
        if (vertices[i+2] < min[2])
            min[2] = vertices[i+2];
    }

    var s0 = Math.abs(max[0] - min[0]);
    var s1 = Math.abs(max[1] - min[1]);
    var s2 = Math.abs(max[2] - min[2]);

    var size = s0;
    if(s1 > size)
        size = s1;
    if(s2 > size)
        size = s2;


    var a = length/3;
    if(a != a || a == 0)
        a = 1;

    return {center : vec3.create([x/a, y/a, z/a]), radius : size/2};
};

model.prototype.bindModelData = function(gl, shader, keys, modelIndex)
{
    var self = this;
    if (self.state === 0) {
        return;
    }

    for(var i = 0; i < keys.length; i++)
    {
        if (shader.shaderProgram.attribute[keys[i]] != null && self.buffers[keys[i]]) {
            // Key buffers
            gl.bindBuffer(gl.ARRAY_BUFFER, self.buffers[keys[i]][modelIndex]);
            gl.vertexAttribPointer(shader.shaderProgram.attribute[keys[i]], self.buffers[keys[i]][modelIndex].itemSize, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(shader.shaderProgram.attribute[keys[i]]);
        }

    }
};

model.prototype.drawModel = function(gl, shader, modelIndex, mode, textureMode)
{
    var self = this;
    if (this.state === 0) {
        return 0;
    }

    if(self.hasTexcoords() && textureMode == true)
    {
        shader.bindUniforms(gl, ["uUseTexture"], [true]);
        self.textures[modelIndex].bindTexture(gl, shader, "uSampler");
    }
    else
    {
        if(shader.hasUniform("uUseTexture"))
            shader.bindUniforms(gl, ["uUseTexture"], [false]);
    }

    var indexKey = self.keys[3];
    if(self.buffers[indexKey][modelIndex] != null)
    {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.buffers[indexKey][modelIndex]);
        var numElements = self.buffers[indexKey][modelIndex].numItems;
        if(mode == "lines")
        {
            gl.drawElements(gl.LINES, numElements, gl.UNSIGNED_SHORT, 0);
        }
        else if(mode == "triangles")
        {
            gl.drawElements(gl.TRIANGLES, numElements, gl.UNSIGNED_SHORT, 0);
        }
    }
    else
    {
        // Arrays
        var vertKey = self.keys[0];
        var numElements = self.buffers[vertKey][modelIndex].numItems;
        if(mode == "lines")
        {
            gl.drawArrays(gl.LINES, 0, numElements);
        }
        else if(mode == "triangles")
        {
            gl.drawArrays(gl.TRIANGLES, 0, numElements);
        }
        return (numElements);
    }
};

model.prototype.bindModelDataAndDraw = function(gl, shader, keys, modelIndex, mode)
{
    var self = this;
    if (self.state === 0) {
        return 0;
    }

    // Vert, Normals, UVs, weights, bones
    for(var i = 0; i < keys.length; i++)
    {
        if (shader.shaderProgram.attribute[keys[i]] != null && self.buffers[keys[i]][modelIndex] != null) {
            // Key buffers
            gl.bindBuffer(gl.ARRAY_BUFFER, self.buffers[keys[i]][modelIndex]);
            gl.vertexAttribPointer(shader.shaderProgram.attribute[keys[i]], self.buffers[keys[i]][modelIndex].itemSize, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(shader.shaderProgram.attribute[keys[i]]);
        }

    }

    var indexKey = self.keys[3];
    if(self.buffers[indexKey][modelIndex] != null)
    {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.buffers[indexKey][modelIndex]);
        var numElements = self.buffers[indexKey][modelIndex].numItems;
        if(mode == "lines")
        {
            gl.drawElements(gl.LINES, numElements, gl.UNSIGNED_SHORT, 0);
        }
        else if(mode == "triangles")
        {
            gl.drawElements(gl.TRIANGLES, numElements, gl.UNSIGNED_SHORT, 0);
        }
    }
    else
    {
        // Arrays
        var vertKey = self.keys[0];
        var numElements = self.buffers[vertKey][modelIndex].numItems/3;
        if(mode == "lines")
        {
            gl.drawArrays(gl.LINES, 0, numElements);
        }
        else if(mode == "triangles")
        {
            gl.drawArrays(gl.TRIANGLES, 0, numElements);
        }
        return (numElements);
    }
};