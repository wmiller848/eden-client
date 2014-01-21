attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uPMatrix;

varying vec4 vViewPosition;
varying vec3 vViewNormal;

void main(void) {
    vViewPosition =  uViewMatrix * uModelMatrix * vec4(aVertexPosition, 1.0);
    vViewNormal = mat3(uModelMatrix * uViewMatrix) * aVertexNormal;
    gl_Position = uPMatrix  * vViewPosition;
}