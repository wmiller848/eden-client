attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat4 uPMatrix;

varying vec2 vTextureCoord;

void main(void) {
    vTextureCoord = aTextureCoord;
    gl_Position = uPMatrix * vec4(aVertexPosition, 1.0);
}