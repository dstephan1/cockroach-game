// *******************************************************
// CS 174a Graphics Example Code
// animation.js - The main file and program start point.  The class definition here describes how to display an Animation and how it will react to key and mouse input.  Right now it has 
// very little in it - you will fill it in with all your shape drawing calls and any extra key / mouse controls.  

// Now go down to display() to see where the sample shapes are drawn, and to see where to fill in your own code.

"use strict"
var canvas, canvas_size, gl = null, g_addrs,
	movement = vec2(), thrust = vec3(), looking = false, prev_time = 0;
var gouraud = false, color_normals = false, solid = false;


// Time
var animate = true, delta_time = 0, prev_time = 0, animation_time = 0;
var frame = 0, framesPassed = 0, fps = 0;

// Very big global thing
var anim;

// Container for base actors
var scene = {};

function sceneAdd(x) {
    scene[x.id] = x;
}
function sceneRemove(x) {
    delete scene[x.id];
}


// global shapes
var handShape, roachShape, cubeShape;
var roachBodyShape,
    roachLFShape, roachLMShape, roachLBShape,
    roachRFShape, roachRMShape, roachRBShape;

// Some math functions //////////////////////////////////////////////



// *******************************************************
// Actor: class for making object manipulation simpler
// 	Shape model - shape rendered
//	vec3 position
//	vec3 ypr (yaw pitch roll) IN DEGREES
//	vec3 scale
//	vec3 origin
//  vec3 color
//	Actor*[] attachments
//		drawing an Actor calculates itself then draws its attachments
var ActorCount = 0; // how do you make a static member?
function Actor(init_shape){
    //console.log("Actor init", init_shape);
    this.id = ActorCount++;
	this.model = init_shape;
	this.position = vec3(0);
	this.ypr = vec3(0);
	this.scale = vec3(1,1,1);
	this.color = vec4(1,1,1,1);
	this.texture = null;
	this.origin = vec3(0);
	this.attachments = [];
}

Actor.prototype.draw = function(B, C, P){	// Basis, Camera, Projection
	var modelMatrix = mat4();
		
    // B*Translate*Rotate
	modelMatrix = yprToMatrix(this.ypr);
	
	modelMatrix = mult(translate(this.position), modelMatrix);				//translation
	modelMatrix = mult(B, modelMatrix);										//parent basis
	modelMatrix = mult(modelMatrix, scale(this.scale));

	// Basis = B*Translate*Rotate*Scale
	var newBasis = modelMatrix;
	
	// Trans = B*Translate*Rotate*Scale*Origin
	modelMatrix = mult(modelMatrix, translate(scale_vec(-1,this.origin)));
	
	gl.uniform4fv( g_addrs.color_loc, 			vec4( this.color,1 ) );		//bind the color	
	this.model.draw( modelMatrix , C, P, this.texture);				

	// draw attachments
	_.each(this.attachments, 
		function(a){
			a.draw(newBasis, C, P);
		}
	);
}	





// *******************************************************	
// When the web page's window loads it creates an Animation object, which registers itself as a displayable object to our other class GL_Context -- which OpenGL is told to call upon every time a
// draw / keyboard / mouse event happens.

window.onload = function init() {	anim = new Animation();	}
function Animation()
{
	( function init (self) 
	{
	// Canvas and GL
		self.context = new GL_Context( "gl-canvas" );
		self.context.register_display_object( self );
		
		self.rect = canvas.getBoundingClientRect();
		self.mouse = {x:480, y:250};

		canvas.addEventListener("mousedown", doMouseDown, false);
		canvas.addEventListener("mousemove", doMouseMove, false);
		canvas.addEventListener("mouseup", doMouseUp, false);
		
		//gl.clearColor(.5, .5, 1, 1);			// Background color
		gl.clearColor(0,0,0,1);			// Background color
		//gl.enable(gl.BLEND);
		//gl.blendEquation(gl.FUNC_ADD);
		//gl.blendFunc(gl.SRC_ALPHA, gl.ZERO);
        //gl.disable(gl.DEPTH_TEST);

	    // Constant shapes
		roachShape = new shape_from_file("Assets/cockroach.obj");  // I realized why reload a file 10x when you can just have 1 model
		roachBodyShape = new shape_from_file("Assets/r/body.obj");
		roachLFShape = new shape_from_file("Assets/r/lf.obj");
		roachLMShape = new shape_from_file("Assets/r/lm.obj");
		roachLBShape = new shape_from_file("Assets/r/lb.obj");
		roachRFShape = new shape_from_file("Assets/r/rf.obj");
		roachRMShape = new shape_from_file("Assets/r/rm.obj");
		roachRBShape = new shape_from_file("Assets/r/rb.obj");

	    //handShape = new shape_from_file("Assets/hand.obj");
		handShape = new shape_from_file("Assets/hand_smooth.obj");
		cubeShape = new cube();

	// Scene 
		var lastCreated, a;

	// Cameras and Viewing
		self.fovy = 45;
		self.znear = .1;
		self.zfar = 1000;
		
		self.cameraPosition = vec3(20, 40,60);
		self.cameraFacing = normalize(vec3(0, -1, -1)); // forward vector (not z)
		//function lookAt( eye, at, up ), returns camera inverse
		self.camera_transform = lookAt(self.cameraPosition, add(self.cameraPosition, self.cameraFacing), vec3(0,1,0));
		self.cameraMatrix = inverse(self.camera_transform);
		self.projection_transform = perspective(self.fovy, canvas.width/canvas.height, self.znear, self.zfar);		// The matrix that determines how depth is treated.  It projects 3D points onto a plane.

		//self.camera_transform = lookAt(vec3(20, 20, 20), vec3(20, 0, 20), vec3(0, 0, -1));
	    //self.projection_transform = ortho(-20, 20, -20, 20, -40, 300);

		//self.camera_up = vec3(0, 1, 0);
		//self.camera_yaw = 0;
		//self.camera_pitch = 0;

	// Lighting
		self.lightdir = vec3(0,-1,0);
		
	// Sounds
		self.hitSound = new Audio("./Assets/paperhit.wav"); // local per hit

		//self.intromusic = new Audio("./Assets/typewriter.mp3");
		//self.intromusic.loop = true;
		//self.intromusic.addEventListener("loadeddata", function () { self.intromusic.play(); });

		self.music = new Audio("./Assets/kairyu.mp3");
		self.music.loop = true;
		//self.music.pause();
		//self.music.currentTime = 0;
		
		self.music.addEventListener("loadeddata", function(){self.music.currentTime=3;});

		console.log(self.music);
		
	// Ground
		self.groundNormal = vec3(0,1,0);
		self.groundPoint = vec3(0,0,0);
		self.handPlane = vec3(0,2.5,0);

		// ground shape
		sceneAdd(self.ground = lastCreated = new Actor(new cube()));
		lastCreated.origin = vec3(-.5,.5,-.5);
		self.ground.scale = vec3(40,1,40);
		//self.ground.ypr = vec3(90,0,0);
		//self.ground.color = vec3(.87,.6,.4);
		self.ground.color = vec3(1,1,1);
		self.ground.texture = "Assets/paper4.png";

		self.ground.position = vec3(0, .01, 0);
		//self.ground.texture = "Assets/wood.png";
		//self.ground.texture = "Assets/carpet.png";

		//sceneAdd(self.wall1 = lastCreated = new Actor(new cube()));
		//lastCreated.origin = vec3(0, -.5, .5);
		//lastCreated.scale = vec3(20, 20, 1);
		//lastCreated.position = vec3(10, 0, 0);
		//lastCreated.texture = "shadowTextureDepth";
	    ////lastCreated.texture = "Assets/paper4.png";
        //
		//sceneAdd(self.wall2 = lastCreated = new Actor(new cube()));
		//lastCreated.origin = vec3(0, -.5, .5);
		//lastCreated.scale = vec3(20, 20, 1);
		//lastCreated.position = vec3(30, 0, 0);
		//lastCreated.texture = "shadowTextureColor";
	    ////lastCreated.texture = "Assets/paper4.png";

		roomInit();

	// Initialize all of our objects and all of their parameters
	
	// HAND 
		sceneAdd(hand = new handActor());
		hand.origin = vec3(0, 0, 0);
		hand.color = vec3(1,1,1);
		hand.texture = "Assets/hand.png"

    // HAMMER
	    //sceneAdd(lastCreated = new Actor(new newspaper0(8)));
		hand.attachments.push(lastCreated = new Actor(new newspaper0(8, 0, 3, .2, .5, .5, .3)));
		lastCreated.position = vec3(-.6, -1, 1.5);
		lastCreated.ypr[1] = 20;
		//lastCreated.scale = vec3(.2, .5, .5);
		lastCreated.texture = "Assets/paper3.png";

		hand.attachments.push(lastCreated = new Actor(new newspaper0(8, 0, 5, .7, 2.5, .2, 1)));
		lastCreated.position = vec3(-.5, .3, -1);
		lastCreated.ypr[1] = 5;
		lastCreated.texture = "Assets/paper3.png";

		lastCreated.attachments.push(hammerEnd = lastCreated = new Actor(new newspaper0(8, 0, 3, 2.5, 4 , 1, 2)));
		lastCreated.position = vec3(0,0,-5);
		//lastCreated.ypr[1] = 5;
		lastCreated.texture = "Assets/paper3.png";

	    //final trapezoid:
	    //  shift right .5
	    //  near width 2.5
	    //  far width 4
	    //  near distance ~cos(25deg)*5 = 4.5 + 1 = 4.5
        //  far distance 3+4.5 = 7.5 = 8.5

	// COCKROACH
		for(var i=0; i<numRoaches; i++){
		    sceneAdd(self.cockroach = lastCreated = new roachActor());
		    lastCreated.ypr[0] = Math.random()*360;
		    lastCreated.position = vec3(Math.random()*40,0,Math.random()*40);
		    lastCreated.color = vec3(1,1,1);
		    self.cockroach.texture = "Assets/cockroach.png";
		}

        

	//// TREE -----------------------------
	//	self.tree = [];
	//	// base
	//	sceneAdd(lastCreated = new Actor(new cube()));	
	//		lastCreated.origin = vec3(0,-.5,0);		// move origin to the base of the cube (the default cube origin is in the center)
	//		lastCreated.position = vec3(0,0,0); 	// attach origin to 0,0,0
	//		lastCreated.color = vec3(.2, .1, 0);	// color brownish
	//		lastCreated.scale = vec3(1, 2, 1);		// 1x2x1 box (scaled relative to origin)
	//	// trunk
	//	for(var i=0; i<8; i++){
	//		lastCreated.attachments.push(lastCreated = new Actor(new cube()));
	//			lastCreated.origin = vec3(0,-.5,0);
	//			lastCreated.position = vec3(0,2,0);	// position acts like an attachment point: attach origin to 0,2,0
	//			lastCreated.color = vec3(.2, .1, 0);
	//			lastCreated.scale = vec3(1, 2, 1);
	//			self.tree.push(lastCreated);	// later on we'll sway each tree part, so add them to an array for easy access
	//	}
	//    // ball
    //    
	//	lastCreated.attachments.push(self.ball = lastCreated = new Actor(new sphere(mat4(), 3)));
	//		lastCreated.origin = vec3(0, -1, 0);	// origin at bottom of sphere (default spheres are r=1)
	//		lastCreated.position = vec3(0,2,0);		
	//		lastCreated.scale = vec3(5,5,5);
	//		lastCreated.color = vec3(0, .6, .2);	// green
	//	console.log(self.tree);
		
		// put the camera at 0,10,40; backwards
		
		//we wont be using any of these, color 4fv is bound in Actor.draw
		//gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);		
		gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);		
		//gl.uniform1i( g_addrs.SOLID_loc, solid);
		
		
		
		//self.projection_transform = ortho(-20, 20, -20, 20, -20, 300);
		//self.camera_transform = lookAt(vec3(20,20,20), vec3(20,0,20), vec3(0,0,-1));
		
		animation_time = 0
		animate = true;
		//gl.useProgram(self.context.shadowProgram);
		
		//self.context.render();
		self.context.startRender();	
		
		
		
		
		//test();
	} ) ( this );	
	
	canvas.addEventListener('mousemove', function(e)	{		e = e || window.event;		movement = vec2( e.clientX - canvas.width/2, e.clientY - canvas.height/2, 0);	});
}

// *******************************************************	
// init_keys():  Define any extra keyboard shortcuts here
Animation.prototype.init_keys = function()
{
	// Strafe: WASD; Height: Space/Z
	shortcut.add( "Space", function() { if(debug) thrust[1] = -1; } );			shortcut.add( "Space", function() { if(debug) thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "z",     function() { if(debug) thrust[1] =  1; } );			shortcut.add( "z",     function() { if(debug) thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "w",     function() { if(debug) thrust[2] =  1; } );			shortcut.add( "w",     function() { if(debug) thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "a",     function() { if(debug) thrust[0] =  1; } );			shortcut.add( "a",     function() { if(debug) thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "s",     function() { if(debug) thrust[2] = -1; } );			shortcut.add( "s",     function() { if(debug) thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "d",     function() { if(debug) thrust[0] = -1; } );			shortcut.add( "d",     function() { if(debug) thrust[0] =  0; }, {'type':'keyup'} );
    shortcut.add( "o",     function() { debug = !debug; } );
	shortcut.add("e", function () { attachHand = !attachHand; });
	console.log(this.music);
	shortcut.add("m", (function (self) {
	    return function () {
	        if (self.music.paused == true)
	            self.music.play();
	        else
	            self.music.pause();
	    };
	})(this));
	// shortcut.add( "f",     function() { looking = !looking; } );
	// shortcut.add( ",",     ( function(self) { return function() { self.camera_transform = mult( rotate( 3, 0, 0,  1 ), self.camera_transform ); }; } ) (this) ) ;
	// shortcut.add( ".",     ( function(self) { return function() { self.camera_transform = mult( rotate( 3, 0, 0, -1 ), self.camera_transform ); }; } ) (this) ) ;
	
	// Reset: R
	shortcut.add( "r",     ( function(self) { return function() { self.camera_transform = translate(0, -10,-40); }; } ) (this) );
	// Top View: F // for some reason T overrides f5 
	shortcut.add( "f",     ( function(self) { return function() { 
													self.camera_transform = mult( rotate(90, 1, 0, 0), mat4());
													self.camera_transform = mult( translate(0, 0, -60), self.camera_transform);
													// camera operations are kind of backwards due to inversing	
													}; } ) (this) );
	
	// shortcut.add( "ALT+s", function() { solid = !solid;					gl.uniform1i( g_addrs.SOLID_loc, solid);	
																		// gl.uniform4fv( g_addrs.SOLID_COLOR_loc, vec4(Math.random(), Math.random(), Math.random(), 1) );	 } );
	shortcut.add( "ALT+g", function() { gouraud = !gouraud;				gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);	} );
	shortcut.add( "ALT+n", function() { color_normals = !color_normals;	gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);	} );
	shortcut.add("p", function () { animate = !animate;} );
	
	// shortcut.add( "p",     ( function(self) { return function() { self.m_axis.basis_selection++; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );
	// shortcut.add( "m",     ( function(self) { return function() { self.m_axis.basis_selection--; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );	
	
	
	// Rotate: up/down/left/right
	shortcut.add( "left",  	( function(self) { if(debug) return function() { self.camera_transform = mult( rotate( -3, 0, 1,  0 ), self.camera_transform ); }; } ) (this) ) ;
	shortcut.add( "right",  ( function(self) { if(debug) return function() { self.camera_transform = mult( rotate( 3, 0, 1,  0 ), self.camera_transform ); }; } ) (this) ) ;
	shortcut.add( "up",  	( function(self) { if(debug) return function() { self.camera_transform = mult( rotate( -3, 1, 0,  0 ), self.camera_transform ); }; } ) (this) ) ;
	shortcut.add( "down",  	( function(self) { if(debug) return function() { self.camera_transform = mult( rotate( 3, 1, 0,  0 ), self.camera_transform ); }; } ) (this) ) ;
	//	 Note that these are world-space rotatiif(debug)ons (not yaw/pitch/roll) 
	//	 this means that the camera will eventuif(debug)ally end up in strange orientations

}

function update_camera( self, animation_delta_time )
	{
		var leeway = 70, border = 50;
		var degrees_per_frame = .0005 * animation_delta_time;
		var meters_per_frame  = .03 * animation_delta_time;
																					// Determine camera rotation movement first
		var movement_plus  = [ movement[0] + leeway, movement[1] + leeway ];		// movement[] is mouse position relative to canvas center; leeway is a tolerance from the center.
		var movement_minus = [ movement[0] - leeway, movement[1] - leeway ];
		var outside_border = false;
		
		for( var i = 0; i < 2; i++ )
			if ( Math.abs( movement[i] ) > canvas_size[i]/2 - border )	outside_border = true;		// Stop steering if we're on the outer edge of the canvas.

		for( var i = 0; looking && outside_border == false && i < 2; i++ )			// Steer according to "movement" vector, but don't start increasing until outside a leeway window from the center.
		{
			var velocity = ( ( movement_minus[i] > 0 && movement_minus[i] ) || ( movement_plus[i] < 0 && movement_plus[i] ) ) * degrees_per_frame;	// Use movement's quantity unless the &&'s zero it out
			self.camera_transform = mult( rotate( velocity, i, 1-i, 0 ), self.camera_transform );			// On X step, rotate around Y axis, and vice versa.
		}
		self.camera_transform = mult( translate( scale_vec( meters_per_frame, thrust ) ), self.camera_transform );		// Now translation movement of camera, applied in local camera coordinate frame
		
		self.cameraMatrix = inverse(self.camera_transform);
		var position = vec3(-self.camera_transform[0][3], -self.camera_transform[1][3], -self.camera_transform[2][3]);
		self.cameraPosition = vec3(mult_vec(self.cameraMatrix, vec4(position,0)));
		
		//console.log(self.cameraMatrix);
        //updateHand();
	}



// *******************************************************	
// display(): called once per frame, whenever OpenGL decides it's time to redraw.

Animation.prototype.display = function(time)
{
       // Time control
    if (!time)
        time = 0;
	delta_time = time - prev_time;
	if (animate)
	    animation_time += delta_time;

	if (prev_time % 1000 > time % 1000) { // reset count every whole number second
	    fps = framesPassed;
	    framesPassed = 0;
	}
	frame++;
	framesPassed++; // counts how many frames have passed in 1 second


	prev_time = time;
	

	mainLoop();
	update_camera(this, delta_time);

	
			
	var model_transform = mat4();
	
	/**********************************
	Start coding here!!!!
	**********************************/
	gl.enable(gl.DEPTH_TEST);
	
	//this.hand.position[1] = 4;
	// (l0, ld, p0, pn)
	var camera = inverse(this.camera_transform);
	var position = vec3(-this.camera_transform[0][3], -this.camera_transform[1][3], -this.camera_transform[2][3]);
	var facing = vec3(camera[0][2], camera[1][2], camera[2][2]);
		// camera position in camera space

	position = mult_vec(camera, vec4(position,0));

	const PI2 = 2*Math.PI;
	
	// Bending the Tree: adjust the roll (x) 
	var tangle = 4,
		tperiod = 5000;
	_.each(this.tree, function(x){
			x.ypr[2] = tangle*Math.sin(time/tperiod*PI2);
	});
	
    gl.useProgram(this.context.shadowProgram)
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowBuffer);
    gl.viewport(0, 0, shadowBuffer.width, shadowBuffer.height);
    gl.viewport(0, 0, shadowBuffer.width, shadowBuffer.height);
	gl.clear( gl.DEPTH_BUFFER_BIT);
	//gl.enable(gl.DEPTH_TEST);
       
	_.each(scene, function (x) {
		x.draw(mat4(), this.camera_transform, this.projection_transform);
	}, this);
	

	gl.useProgram(this.context.program);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, canvas.width, canvas.height);
	 // Draw every root Actor in the scene
	 _.each(scene, function(x){
		 x.draw(mat4(), this.camera_transform, this.projection_transform);
	 }, this);


	//gl.disable(gl.DEPTH_TEST);
}	



Animation.prototype.update_strings = function( debug_screen_object )		// Strings this particular class contributes to the UI
{
	//debug_screen_object.string_map["bzz"] = "buzzzzzz";
	debug_screen_object.string_map["time"] = "Time: " + animation_time / 1000 + "s";
	//debug_screen_object.string_map["time"] = "Time: " + time / 1000 + "s";
	//debug_screen_object.string_map["basis"] = "Showing basis: " + this.m_axis.basis_selection;
	debug_screen_object.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
	//debug_screen_object.string_map["thrust"] = "Thrust: " + thrust;
	debug_screen_object.string_map["fps"] = "fps: " + fps;
	debug_screen_object.string_map["points"] = "points: " + points;
}