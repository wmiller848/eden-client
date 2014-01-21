attribute vec3 aVertexPosition;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uPMatrix;

varying vec4 vViewPosition;

void main(void) {
    vViewPosition =  uViewMatrix * uModelMatrix * vec4(aVertexPosition, 1.0);
    gl_Position = uPMatrix  * vViewPosition;
}