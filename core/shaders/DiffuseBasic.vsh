attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec2 aTextureCoord;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uPMatrix;
uniform mat3 uNMatrix;

uniform vec3 uCameraPos;

varying vec3 vWorldNormal;
varying vec4 vWorldPosition;
varying vec4 vViewPosition;

varying vec2 vTextureCoord;

void main(void) {
    vTextureCoord = aTextureCoord;
    vWorldPosition =  uModelMatrix * vec4(aVertexPosition, 1.0);
    vWorldNormal = normalize(uNMatrix * aVertexNormal);
    vec4 viewPos = uViewMatrix * vWorldPosition;
    vViewPosition = vec4(normalize(uCameraPos - vWorldPosition.xyz), 1.0);
    vec4 glPos = uPMatrix  * viewPos;
    gl_Position = glPos;
}