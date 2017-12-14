
// time control with: animate = true;
var gameWidth = 40, gameHeight = 40;
var points = 0;
var multiplier = 1;

// 0: init, 1: movie, 2: game
var gameState = 0;

var debug = true;


// MAIN ----------------------------

function mainLoop() {

    if (animate) {
        switch (gameState) {
            case 0:
                cineStart();
                break;
            case 1:
                cineLoop();
                break;
            case 2:
                break;
        }

        registerTimeEvents();
        updateHand();
        _.each(cockroaches,
            function (bug) {
                bug.think();
            }
        );

        multiplier = points * 2 / 100 / 100 + 1;
    }

}

function start() {
    // Camera
    depthProjectionMatrix = ortho(-21, 42, -40, 21, 0, 40);
    depthViewMatrix = lookAt(vec3(20, 30, 20), vec3(20, 0, 20), vec3(0, 0, -1));
    depthViewProjection = mult(depthProjectionMatrix, depthViewMatrix);

    anim.fovy = 45;
    anim.znear = .1;
    anim.zfar = 1000;

    anim.cameraPosition = vec3(20, 50, 60);
    //anim.cameraFacing = normalize(vec3(0, -1, -1)); // forward vector (not z)
    //function lookAt( eye, at, up ), returns camera inverse
    anim.camera_transform = lookAt(anim.cameraPosition, vec3(20, 0, 25), vec3(0, 1, 0));

    debug = false;
    attachHand = true;
    points = 0;
    //anim.intromusic.pause();
    anim.music.play();
    gameState = 2;

    console.log("trying to update");
    updateHand();
    //doMouseMove();
}

/////// ACTORS ------------------------------------------------------------------

// Booleans
var attachHand = false;
var hand;
var hammerEnd;

// Hand
function handActor() {
    //Actor.call(this, [].slice.call(arguments));
    Actor.call(this, handShape);
    this.position = vec3(-10, -10, -10);
} inherit(handActor, Actor);


// Cockroach
var cockroaches = {}, numRoaches = 5;
function howManyRoaches() {
    return Object.keys(cockroaches).length;
}
function roachActor() {
    Actor.call(this, roachBodyShape);

    this.attachPart = function( x ){
        var newpart;
        this.attachments.push(newpart = new budgetActor(x));
        newpart.texture = "Assets/cockroach.png";
    }    
    this.attachPart(roachLFShape);
    this.attachPart(roachLMShape);
    this.attachPart(roachLBShape);
    this.attachPart(roachRFShape);
    this.attachPart(roachRMShape);
    this.attachPart(roachRBShape);
    
    cockroaches[this.id] = this;

    // timers
    var atime = 0, amult = 1;  // internal animation time, animation time multiplier
    var mtime = 0;  // motion time, current time in the current motion
    var wtime = 0;  // wait time, max time in the current motion
   
    // some constants
    var legsPerInch = .6; // cycles/second per unit length 

    // sick ai
    this.motionState = 0;
    //-1 dead
    // 0 waiting
    // 1 walking
    // 2 jumping
    // 3 falling

    this.velocity = vec3(0,0,0);
    //var panic = false;  // unused

    this.think = function () {
        //console.log("I AM THINKING");
        // 
        //this.motionState = 0;

        atime += delta_time * amult;
        mtime += delta_time;
        switch( this.motionState ){
            case -1:    // crushed
                break;
            case 0:     // resting
                if (mtime > wtime)
                    this.goWalkSomewhere();

                if (chance(1, 4000)) { // spin randomly
                    this.spin();
                }
                else if (chance(1, 1000)) { // shake randomly
                    this.shake();
                }

                break;
            case 1:     // walking
                if (mtime > wtime)
                    this.takeABreak();
                this.position = add(this.position, scale_vec(delta_time, this.velocity));
                break;
            case 2:     // jump
                break;

            case 3:     // fall from the sky
                this.velocity[1] -= roachGravity*delta_time;
                this.position = add(this.position, scale_vec(delta_time, this.velocity));
                if (this.position[1] < 0) {
                    this.position[1] = 0;
                    this.goWalkSomewhere();
                    var dropSound = new Audio("./Assets/drop.wav");
                    dropSound.play();
                }
                break;
            case 4:     // spin
                if (mtime > wtime)
                    this.takeABreak();
                break;
            case 5:     // shake
               
                if (mtime > wtime)
                    this.goWalkSomewhere();
                break;
        }
        //this.position[0] = positiveMod(this.position[0], 40);
        //this.position[2] = positiveMod(this.position[2], 40);
        this.position[0] = clamp(this.position[0], 0, 40);
        this.position[2] = clamp(this.position[2], 0, 40);
        if (atime > 1000 * this.motionState + 1000) {
            atime = 1000 * this.motionState;
        }
        this.animBody();
    }
    this.goWalkSomewhere = function () {
        this.motionState = 1;
        mtime = 0;
        wtime = rangeRand(2000, 4000) / multiplier;

        var speed = multiplier * rangeRand(4/1000, 8/1000);
        var dr = Math.random();
        var direction =  dr * 2 * Math.PI;
        this.velocity = vec3(speed*Math.sin(direction), 0, speed*Math.cos(direction));
        this.ypr[0] = dr * 360 + 180;


        amult = legsPerInch * speed * 1000;
    }
    this.takeABreak = function () {
        this.motionState = 0;
        mtime = 0;
        wtime = rangeRand(1000, 2000) / multiplier;
        //wtime = 60000;
        this.velocity = vec3(0, 0, 0);
    }
    this.crush = function () {
        this.motionState = -1;
        mtime = 0;
        //wtime = rangeRand(3000, 5000);
        var me = this;
        addTimeEvent(2000, function () {
            me.remove();
            
        });
        addTimeEvent(rangeRand(1000,2000), 
            function () {
                dropRoach();
            }
        );

        this.scale[1] = .1;
        this.scale[0] = 1.3;
        //this.color = vec3(.5, .5, .5, .1);
        this.color = vec4(.7,.7,.7, .7);

        points += 100;
        if (points % 1000 == 0) {
            dropRoach();
        }
        var crushSound = new Audio("./Assets/crush.wav");
        crushSound.play();
    }

    var roachGravity = 32/1000000;
    this.fallFromTheHeavens = function () {
        this.position = vec3(Math.random() * 40, 40, Math.random() * 40);
        var speed = rangeRand(0 / 1000, 6 / 1000);
        var dr = Math.random();
        var direction = dr * 2 * Math.PI;
        this.velocity = vec3(speed * Math.sin(direction), 0, speed * Math.cos(direction));
        this.ypr[0] = dr * 360 + 180;

        //console.log("falling far");
        this.motionState = 3;
        //console.log(howManyRoaches());
    }
    this.spin = function () {
        atime = 4000;
        amult = rangeRand(1, 2);
        this.motionState = 4;
        wtime = rangeRand(3000, 3000);
    }
    this.shake = function () {
        atime = 5000;
        this.motionState = 5;
        wtime = rangeRand(500, 2000);
    }


    var T = 1000 / 2 / Math.PI; // 1 hz
    var pi3 = Math.PI / 3;
    var pi23 = 2 * Math.PI / 3;
    var pi43 = 4 * Math.PI / 3;

    // cockroach animations
    this.animBody = function () {
        // Elliptical motion legs
        // Cockroach body motion
        // https://www.youtube.com/watch?v=o7zpWQBXflc
        // Middle leg cycle
        // Front leg cycle
        // Back leg cycle

        // Left and right sides alternate
        //  2pi
        // [M        ][F  ][B    ]
        //  pi        pi/3  2pi/3

        if (atime > 0 && atime < 1000) {

        }
        else if(atime > 1000 && atime < 2000){
            var t = atime / T;

            for (var other = 0; other < 2; other++) {
                var p = t + other * Math.PI;
                this.attachments[1 + 3 * other].position[2] = .1 * Math.cos(p);
                this.attachments[1 + 3 * other].position[1] = .035 + .04 * Math.sin(p);

                this.attachments[0 + 3 * other].position[2] = .1 * Math.cos(p + Math.PI);
                this.attachments[0 + 3 * other].position[1] = .04 + .06 * Math.sin(p + Math.PI);

                this.attachments[2 + 3 * other].position[2] = .2 * Math.cos(p);
                this.attachments[2 + 3 * other].position[1] = .03 - .05 * Math.sin(p + pi43);
            }
        }
        else if (atime > 4000 && atime < 5000) { // spinning
            //this.ypr[0] += 100 / 1000 * delta_time;
            this.ypr[0] += 1 * delta_time * amult;
        }
        else if (atime > 5000 && atime < 6000) { // shaking
            this.ypr[0] = this.ypr[0] + 5 * Math.sin(atime);
        }

    }
    //function(a){
    //    a.draw(newBasis, C, P);
    //}

    this.remove = function () {
        delete cockroaches[this.id];
        delete scene[this.id];
    }

} inherit(roachActor, Actor);

function budgetActor(shape) {
    Actor.call(this, shape);

} inherit(budgetActor, Actor);

// Very low budget draw function
budgetActor.prototype.draw = function (B, C, P) {
    // B*T
    var modelMatrix = mult(translate(this.position), mat4());
    modelMatrix = mult(B, modelMatrix);
    //gl.uniform4fv(g_addrs.color_loc, vec4(this.color, 1));		//bind the color
    this.model.draw(modelMatrix, C, P, this.texture);

    // var modelMatrix = mat4();
    // B*Translate*Rotate
    //modelMatrix = yprToMatrix(this.ypr);
    //modelMatrix = mult(translate(this.position), modelMatrix);				//translation
    										//parent basis
    // Basis = B*Translate*Rotate
    //var newBasis = modelMatrix;
    // Trans = B*Translate*Rotate*Scale*Origin
    //modelMatrix = mult(modelMatrix, translate(scale_vec(-1, this.origin)));
}


// Dust
var gravity = 4/1000000;    // units / ms^2 -> we have to divide by 1000^2
function dustActor() {
    Actor.call(this, cubeShape);
    //console.log("DUST ID", this.id);
    this.scale = vec3(.2,.2,.2);
    this.velocity = vec3(Math.random()*2 - 1, 4 + Math.random(), Math.random()*2 - 1);
    this.velocity = scale_vec(1 / 1000, this.velocity);

    //var rC = rangeRand(.4, .6);
    var rC = .2;
    this.color = vec4(rC, rC, rC, .8);

    var me = this;
    addTimeEvent(1000, 
        function () {
            sceneRemove(me);

            //console.log("attempting removal", me.id);
        }, this);
    
} inherit(dustActor, budgetActor);

// Another budget draw
dustActor.prototype.draw = function (B, C, P) {
    if (animate) {
        this.position = add(this.position, scale_vec(delta_time, this.velocity));
        this.velocity[1] = this.velocity[1] - gravity * delta_time;
    }
    gl.uniform4fv(g_addrs.color_loc, vec4(this.color, 1));		//bind the color

    var modelMatrix = mult(translate(this.position), mat4());
    modelMatrix = mult(modelMatrix, scale(.3, .3, .3));
    this.model.draw(modelMatrix, C, P, this.texture);

    //modelMatrix = mult(B, modelMatrix);
    //gl.uniform4fv(g_addrs.color_loc, vec4(this.color, 1));		//bind the color
    
    //Actor.prototype.draw.bind(this).apply(this, arguments);
    //budgetActor.prototype.draw.bind(this).apply(this, arguments);
}


/////// EVENTS ------------------------------------------------------------------

function doMouseDown(e) {
	e.preventDefault();
    if(animate)
        handDown(anim);
    if (gameState == 1) {
        start();
    }
}
function doMouseUp(e) {
    if(animate)
        handUp(anim);
}
function doMouseMove(e) {
    //console.log(anim);
    //if (attachHand) {
        anim.rect = canvas.getBoundingClientRect();
        anim.mouse.x = e.clientX - anim.rect.left;
        anim.mouse.y = e.clientY - anim.rect.top;

    //}

}
function updateHand() {
   if (!attachHand) {
       return;
   }
    // //console.log("hello");
    //console.log(anim);
   //anim.mouse.x;
   var rx = (2 * anim.mouse.x - anim.rect.width) / anim.rect.height;
   var ry = -(2 * anim.mouse.y - anim.rect.height) / anim.rect.height;
    //console.log(rx, ry);
   var l0 = anim.cameraPosition;
   var ld = vec3(mult_vec(anim.cameraMatrix, getMouseVector(anim.fovy, rx, ry)));
   var p0 = anim.handPlane;
   var pn = anim.groundNormal;
    // l0 ld p0 pn
   hand.position = xLinePlane(l0, ld, p0, pn);

   hand.position[0] = clamp(hand.position[0], 0, gameWidth);
   hand.position[2] = clamp(hand.position[2], 8, gameHeight + 8);
}
function handDown(self) {
    //console.log("down");
    hand.ypr[1] = -30;
    hammerEnd.ypr[1] = 25;
    //anim.hitSound.currentTime = 0;

    var newSound = new Audio("./Assets/paperhit.wav");
    newSound.play();

    hitCollision();

    var dust;
    var dustcount = 5;
    for (var i = 0; i < dustcount; i++) {
        sceneAdd(dust = new dustActor());
        dust.position[0] = hand.position[0] + Math.random();
        dust.position[2] = hand.position[2]-8 + Math.random();

    }

}
function handUp(self) {
    //console.log("up");
    hand.ypr[1] = 0;
    hammerEnd.ypr[1] = 0;
}

function dropRoach() {
    var lastCreated;
    sceneAdd(lastCreated = new roachActor());
    lastCreated.color = vec3(1, 1, 1);
    lastCreated.texture = "Assets/cockroach.png";
    lastCreated.fallFromTheHeavens();
}

// Collisions ----------------------------------------------------------------

// collision trapezoid with respect to the mouse attachment point, CCW order
var hitTrapezoid = [];
hitTrapezoid.push(vec2(1.5, -8.5));
hitTrapezoid.push(vec2(-2.5, -8.5));
hitTrapezoid.push(vec2(-1.75, -5.5));
hitTrapezoid.push(vec2(1.25, -5.5));

// Precalculate trapezoid normals for faster computation
//normal.push(-y, x), where t = (x, y) = ht[1] - ht[0]
var trapeNormal = [];
for (var i = 0; i < 4; i++) {
    trapeNormal.push([]);
    // flipped around because ccw rotation about y axis is backwards
    var negY = hitTrapezoid[(i+1)%4][1] - hitTrapezoid[i][1];   
    var posX = - hitTrapezoid[(i+1)%4][0] + hitTrapezoid[i][0];
    //console.log(negY, posX);
    trapeNormal[i].push( negY, posX);
}

function inTrapezoid(ht, x) {
    var inside = true;
    for(var i=0; i<4; i++){
        inside &= dot(trapeNormal[i], subtract(x, ht[i])) > 0;
        //console.log(dot(trapeNormal[i], subtract(x, ht[i])));
        //if (inside)
        //    console.log("HIT");
        //else
        //    console.log("MISS");
    }
    return inside;
}

function hitCollision() {
    var ht = [];
    for (var i = 0; i < 4; i++) {
        ht.push([]);
        ht[i][0] = hitTrapezoid[i][0] + hand.position[0];
        ht[i][1] = hitTrapezoid[i][1] + hand.position[2];
    }

    _.each(cockroaches,
        function (c) {
            // Skip if already hit
            if (c.motionState == -1 || c.motionState == 3) {
                return;
            }
            var position2d = vec2(c.position[0], c.position[2]);
            if (inTrapezoid(ht, position2d)) {
                //console.log("HIT");
                
                c.crush();
            }
        }
    );
}

//// ded function, bad math
//function ccwTri(a, b, c) {
//    var x = subtract(b, a);
//    var y = subtract(c, a);
//    var z = dot(x, y);
//    var t = z > 0;
//
//    console.log(x, y);
//    //var t = dot(subtract(b, a), subtract(c, a)) > 0;
//    if (t) console.log("HIT");
//    return;
//}


// Time Events ----------------------------------------------------------------
//  This is pretty straightforward but the javascript is very funky.
//  a list of events, check if event timer has passed, run the function when it does


var timeEventsCounter = 0;
var timeEvents = {};
// Object.prototype.toString.call(parameters) == "[object Function]"

// in milliseconds
function timeEvent(t, idin, f, c) {
    this.endTime = animation_time + t;
    this.id = timeEventsCounter++;
    this.func = f;
    this.context = c;
    //console.log("Adding time event ", timeEventsCounter, this.endTime);
}

function addTimeEvent(delay, func, context) {
    var te = new timeEvent(delay, timeEventsCounter, func, context);
    timeEvents[te.id] = te;
    //    func.bind(context, )
}

function registerTimeEvents() {
    this.name2 = "in the register";
    //console.log(this);
    _.each(timeEvents,
        function foreach(e) {
            if (e == timeEvents) {
                return;
            }
            //console.log(e);
            //console.log("in the each");
            if (animation_time > e.endTime) {
                //console.log("it happened", e.id);
                timeEvents[e.id].func();

                delete timeEvents[e.id];
            }
        }, this
    );

}




// Camera demonstrations ----------------------------------------------------------------------
var followRoach, r1, r2;
var moveHand = false;
function cineStart() {
    gameState = 1;
    attachHand = false;
    addTimeEvent(5000, bringInTheHand);
    console.log('cinestart');

    r1 = getRandomCockroach();
    r2 = getRandomCockroach();
}


function cineLoop() {
    
    runRandomCamera();
    if (animation_time < 3000) {
        var x = r1;
        anim.camera_transform = lookAt(add(x.position, vec3(1, 5, 5)), x.position, vec3(0, 1, 0));
        //watchRoach();   
    }
    else if (animation_time < 6000) {
        var x = r2;
        anim.camera_transform = lookAt(anim.cameraPosition, x.position, vec3(0, 1, 0));
        //followRoach();
    }
    else if (animation_time < 8000) {

    }
    else {
        runRandomCamera();
    }
    if (moveHand) {
        hand.position[2] -= .01 * delta_time;
        if (hand.position[2] < 25)
            stopHand();
        else if (hand.position[2] < 45)
            cameraLookAtHand();

    }
}

function bringInTheHand() {
    moveHand = true;
    hand.position = vec3(20, 3, 80);
}
function stopHand() {
    moveHand = false;
    //addTimeEvent(1000, );
}

function runRandomCamera() {

}

// unused
function followRoach() {
    //var x = getRandomCockroach();
    anim.camera_transform = lookAt(add(x.position, vec3(1,5,5)), x.position , vec3(0, 1, 0));
}
function watchRoach(){
    //var x = getRandomCockroach();
    anim.camera_transform = lookAt(anim.cameraPosition, x.position, vec3(0, 1, 0));
}

function cameraLookAtHand() {

    anim.cameraPosition = vec3(15, .1, 5);
    anim.camera_transform = lookAt(anim.cameraPosition, hand.position, vec3(0, 1, 0));
}


// UTILITY ------------------------------------------------------------------------------------
function rangeRand(min, max) {
    return Math.random() * (max - min) + min;
}

function positiveMod(x, mod) {
    return x % mod + mod * (x < 0);
}

function clamp(x, min, max) {
    if (x < min) return min;
    if (x > max) return max;
    return x;
}

function getRandomCockroach(){
    var i = Math.floor(rangeRand(0, Object.keys(cockroaches).length));
    return cockroaches[Object.keys(cockroaches)[i]];
}

// x/y chance (1/1000) to return true
function chance(x, y) {
    if (Math.random() * y <= x) return true;
}

// interLinePlane intersects a line and a plane
// l0:	point on line
// ld:	direction of line
// p0:	point on plane
// pn:	direction of plane normal
function xLinePlane(l0, ld, p0, pn) {
    return add(scale_vec(((dot(p0, pn) - dot(l0, pn)) / dot(ld, pn)), ld), l0);
    //return scale_vec(3,vec3(1,1,1)) + vec3(0,0,5);
}
function xLinePlane2(l0, ld, p0, pn) {
    return l0;
}
function yprToMatrix(ypr) {
    var modelMatrix = mult(rotate(ypr[2], 0, 0, 1), mat4());			//roll
    modelMatrix = mult(rotate(ypr[1], 1, 0, 0), modelMatrix);			//pitch
    modelMatrix = mult(rotate(ypr[0], 0, 1, 0), modelMatrix);			//yaw
    return modelMatrix;
}

// getMouseVector finds the vector coming out of the camera pointed to by the current mouse position
// fovy: field of view angle (left to right, the whole thing not half)
// rx  : ratio of x to ymax, range[-aspect, +aspect]
// ry  : ratio of y to ymax, range[-1, 1]
function getMouseVector(fovy, rx, ry) {
    var t = Math.tan(radians(fovy / 2));
    return vec3(rx * t, ry * t, -1);
}
