precision mediump float;

varying vec2 vTextureCoord;

/// Texture samples used by this shader.
uniform sampler2D uSampler0;	// View space position data
uniform sampler2D uSampler1;	// View space normal vectors
uniform sampler2D uSampler2;	// Normal map to randomize the sampling kernel
uniform vec2 uTexelSize;

/// Occluder bias to minimize self-occlusion.
uniform float uOccluderBias;
/// Specifies the size of the sampling radius.
uniform float uSamplingRadius;
/// Ambient occlusion attenuation values.
/// These parameters control the amount of AO calculated based on distance
/// to the occluders. You need to play with them to find the right balance.
///
/// .x = constant attenuation. This is useful for removing self occlusion. When
///		 set to zero or a low value, you will start to notice edges or wireframes
///		 being shown. Typically use a value between 1.0 and 3.0.
///
///	.y = linear attenuation. This provides a linear distance falloff.
/// .z = quadratic attenuation. Smoother falloff, but is not used in this shader.
uniform vec2 uAttenuation;

/// Sample the ambient occlusion at the following UV coordinate.
float SamplePixels (vec3 srcPosition, vec3 srcNormal, vec2 uv)
{
	// Get the 3D position of the destination pixel
	vec3 dstPosition = texture2D(uSampler0, uv).xyz;

	// Calculate ambient occlusion amount between these two points
	// It is similar to diffuse lighting. Objects directly above the fragment cast
	// the hardest shadow and objects closer to the horizon have minimal effect.
	vec3 positionVec = dstPosition - srcPosition;
	float intensity = max(dot(normalize(positionVec), srcNormal) - uOccluderBias, 0.0);

	// Attenuate the occlusion, similar to how you attenuate a light source.
	// The further the distance between points, the less effect AO has on the fragment.
	float dist = length(positionVec);
	float attenuation = 1.0 / (uAttenuation.x + (uAttenuation.y * dist));
	
	return intensity * attenuation;
}

void main (void)
{
	// Get position and normal vector for this fragment
	vec3 srcPosition = texture2D(uSampler0, vTextureCoord).xyz;
	vec3 srcNormal = texture2D(uSampler1, vTextureCoord).xyz;
	vec2 randVec = normalize(texture2D(uSampler2, vTextureCoord).xy * 2.0 - 1.0);
	float srcDepth = texture2D(uSampler0, vTextureCoord).w;
	
	// The following variable specifies how many pixels we skip over after each
	// iteration in the ambient occlusion loop. We can't sample every pixel within
	// the sphere of influence because that's too slow. We only need to sample
	// some random pixels nearby to apprxomate the solution.
	//
	// Pixels far off in the distance will not sample as many pixels as those close up.
	float kernelRadius = uSamplingRadius * (1.0 - srcDepth);
	
	// Sample neighbouring pixels
	vec2 kernel[4];
	kernel[0] = vec2(0.0, 1.0);		// top
	kernel[1] = vec2(1.0, 0.0);		// right
	kernel[2] = vec2(0.0, -1.0);	// bottom
	kernel[3] = vec2(-1.0, 0.0);	// left
	
	const float Sin45 = 0.707107;	// 45 degrees = sin(PI / 4)
	
	// Sample from 16 pixels, which should be enough to appromixate a result. You can
	// sample from more pixels, but it comes at the cost of performance.
	float occlusion = 0.0;
	for (int i = 0; i < 4; ++i)
	{
		vec2 k1 = reflect(kernel[i], randVec);
		vec2 k2 = vec2(k1.x * Sin45 - k1.y * Sin45,
					   k1.x * Sin45 + k1.y * Sin45);
		k1 *= uTexelSize;
		k2 *= uTexelSize;
		
		occlusion += SamplePixels(srcPosition, srcNormal, vTextureCoord + k1 * kernelRadius);
		occlusion += SamplePixels(srcPosition, srcNormal, vTextureCoord + k2 * kernelRadius * 0.75);
		occlusion += SamplePixels(srcPosition, srcNormal, vTextureCoord + k1 * kernelRadius * 0.5);
		occlusion += SamplePixels(srcPosition, srcNormal, vTextureCoord + k2 * kernelRadius * 0.25);
	}
	
	// Average and clamp ambient occlusion
	occlusion /= 16.0;
	occlusion = clamp(occlusion, 0.0, 1.0);
	
	gl_FragColor.x = occlusion;
}