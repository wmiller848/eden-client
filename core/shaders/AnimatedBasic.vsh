attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec2 aTextureCoord;

attribute vec3 aWeightA;
attribute vec2 aWeightB;

attribute vec3 aBoneA;
attribute vec2 aBoneB;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uPMatrix;
uniform mat3 uNMatrix;

uniform mat4 uBoneMats[75];

uniform vec3 uCameraPos;

varying vec3 vWorldNormal;
varying vec4 vWorldPosition;
varying vec4 vViewPosition;

varying vec2 vTextureCoord;

mat4 accumulateSkinMat() {
    mat4 result = mat4( 1.0, 0.0, 0.0, 0.0,
                        0.0, 1.0, 0.0, 0.0,
                        0.0, 0.0, 1.0, 0.0,
                        0.0, 0.0, 0.0, 1.0
                      );

    if(int(aBoneA.x) != -1)
        result += aWeightA.x * uBoneMats[int(aBoneA.x)];
    if(int(aBoneA.y) != -1)
        result += aWeightA.y * uBoneMats[int(aBoneA.y)];
    if(int(aBoneA.z) != -1)
        result += aWeightA.z * uBoneMats[int(aBoneA.z)];

    if(int(aBoneB.x) != -1)
        result += aWeightB.x * uBoneMats[int(aBoneB.x)];
    if(int(aBoneB.y) != -1)
        result += aWeightB.y * uBoneMats[int(aBoneB.y)];

    return result;
}

void main(void) {
    vTextureCoord = aTextureCoord;
    mat4 skin = accumulateSkinMat();
    vWorldPosition = uModelMatrix * vec4(aVertexPosition, 1.0);
    vWorldNormal = normalize(uNMatrix * aVertexNormal);
    vec4 viewPos = uViewMatrix * vWorldPosition;
    vViewPosition = vec4(normalize(uCameraPos - vWorldPosition.xyz), 1.0);
    vec4 glPos = uPMatrix  * viewPos;
    gl_Position = glPos;
}