precision mediump float;

varying vec2 vTextureCoord;

// Texture samples used by this shader.
uniform sampler2D uSampler0;	// Bitmap
uniform sampler2D uSampler1;	// SSAO

void main (void)
{
	// Get scene colour and ambient occlusion values
	vec3 colour = texture2D(uSampler0, vTextureCoord).xyz;
	float ao = texture2D(uSampler1, vTextureCoord).x;

	// Blend the two
	colour = clamp(colour - ao, 0.0, 1.0);
	gl_FragColor = vec4(colour, 1.0);
}