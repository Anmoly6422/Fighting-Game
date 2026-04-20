const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

canvas.width = 1024;
canvas.height = 576;

const gravity = 0.7;
const speed = 5;
const jumpForce = 18;

let difficulty = "easy";
let gameOver = false;
let timer = 60;
let timerInterval;

let p1Health = 100;
let p2Health = 100;

let fireballs = [];
let explosions = [];

/* SCREEN SHAKE */
function screenShake() {
    canvas.style.transform = `translate(${Math.random()*6}px, ${Math.random()*6}px)`;
    setTimeout(() => canvas.style.transform = "translate(0,0)", 60);
}

/* TIMER */
function startTimer() {
    timerInterval = setInterval(() => {
        if (timer > 0 && !gameOver) {
            timer--;
            document.getElementById("timer").innerText = timer;
        } else {
            endGame();
        }
    }, 1000);
}

/* FIREBALL */
class Fireball {
    constructor(x, y, dir, owner) {
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.velocity = dir * 8;
        this.owner = owner;
        this.life = 100;
    }

    draw() {
        const gradient = c.createRadialGradient(this.x, this.y, 2, this.x, this.y, this.radius);
        gradient.addColorStop(0, "yellow");
        gradient.addColorStop(1, "red");

        c.fillStyle = gradient;
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fill();
    }

    update() {
        this.x += this.velocity;
        this.life--;
        this.draw();
    }
}

/* EXPLOSION */
class Explosion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.life = 20;
    }

    draw() {
        c.fillStyle = `rgba(255,150,0,${this.life/20})`;
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fill();
    }

    update() {
        this.radius += 2;
        this.life--;
        this.draw();
    }
}

/* FIGHTER */
class Fighter {
    constructor(x, color) {
        this.width = 60;
        this.height = 150;

        this.position = { x, y: canvas.height - this.height };
        this.velocity = { x: 0, y: 0 };

        this.color = color;
        this.facing = 1;

        this.canShoot = true;
        this.isBlocking = false;
    }

    draw() {
        const x = this.position.x;
        const y = this.position.y;

        c.fillStyle = this.isBlocking ? "cyan" : this.color;

        c.beginPath();
        c.arc(x + 30, y + 20, 18, 0, Math.PI * 2);
        c.fill();

        c.fillRect(x + 15, y + 40, 30, 60);
    }

    update() {
        this.draw();

        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        if (this.position.y + this.height >= canvas.height) {
            this.velocity.y = 0;
            this.position.y = canvas.height - this.height;
        } else {
            this.velocity.y += gravity;
        }

        if (this.position.x < 0) this.position.x = 0;
        if (this.position.x + this.width > canvas.width)
            this.position.x = canvas.width - this.width;

        if (this.velocity.x > 0) this.facing = 1;
        if (this.velocity.x < 0) this.facing = -1;
    }

    shoot() {
        if (!this.canShoot || gameOver) return;

        const fx = this.position.x + 30 + this.facing * 20;
        const fy = this.position.y + 50;

        fireballs.push(new Fireball(fx, fy, this.facing, this));

        this.canShoot = false;
        setTimeout(() => this.canShoot = true, 500);
    }
}

const player = new Fighter(100, "red");
const bot = new Fighter(800, "blue");

/* BOT AI */
function botAI() {
    if (gameOver) return;

    const dist = player.position.x - bot.position.x;

    let move = 1.5, shootChance = 0.02;

    if (difficulty === "medium") {
        move = 2.5; shootChance = 0.04;
    }
    if (difficulty === "hard") {
        move = 3.5; shootChance = 0.06;
    }

    bot.facing = dist > 0 ? 1 : -1;

    if (Math.abs(dist) > 150) {
        bot.velocity.x = dist > 0 ? move : -move;
    } else {
        bot.velocity.x = 0;

        if (Math.random() < shootChance) bot.shoot();

        // random block
        bot.isBlocking = Math.random() < 0.02;
    }
}

/* COLLISION */
function hitFireball(fb, target) {
    return (
        fb.x > target.position.x &&
        fb.x < target.position.x + target.width &&
        fb.y > target.position.y &&
        fb.y < target.position.y + target.height
    );
}

/* DAMAGE SYSTEM */
function applyDamage(target, amount, id) {
    if (target.isBlocking) amount *= 0.3;

    if (target === player) {
        p1Health -= amount;
        updateHealth("p1Health", p1Health);
    } else {
        p2Health -= amount;
        updateHealth("p2Health", p2Health);
    }

    screenShake();
}

/* GAME LOOP */
function animate() {
    if (gameOver) return;

    requestAnimationFrame(animate);

    c.fillStyle = "#000";
    c.fillRect(0, 0, canvas.width, canvas.height);

    player.update();
    bot.update();
    botAI();

    fireballs.forEach((fb, i) => {
        fb.update();

        if (fb.life <= 0) fireballs.splice(i, 1);

        if (fb.owner === player && hitFireball(fb, bot)) {
            explosions.push(new Explosion(fb.x, fb.y));
            fireballs.splice(i, 1);
            applyDamage(bot, 10);
        }

        if (fb.owner === bot && hitFireball(fb, player)) {
            explosions.push(new Explosion(fb.x, fb.y));
            fireballs.splice(i, 1);
            applyDamage(player, 10);
        }
    });

    explosions.forEach((ex, i) => {
        ex.update();
        if (ex.life <= 0) explosions.splice(i, 1);
    });

    if (p1Health <= 0 || p2Health <= 0) {
        endGame();
    }
}

/* END GAME */
function endGame() {
    gameOver = true;
    clearInterval(timerInterval);

    const result = document.getElementById("result");
    const replay = document.getElementById("replay");

    result.classList.add("show");

    if (p1Health > p2Health) {
        result.innerText = "YOU WIN!";
        result.classList.add("win");
    } else if (p2Health > p1Health) {
        result.innerText = "BOT WINS!";
        result.classList.add("lose");
    } else {
        result.innerText = "DRAW!";
    }

    replay.style.display = "block";

    document.body.classList.add("slowmo");
}

/* UI */
function updateHealth(id, value) {
    if (value < 0) value = 0;

    const bar = document.getElementById(id);
    bar.style.width = value + "%";
    bar.classList.add("damage");

    setTimeout(() => bar.classList.remove("damage"), 200);
}

/* START */
function startGame(level) {
    difficulty = level;
    document.getElementById("startScreen").style.display = "none";
    document.getElementById("gameUI").classList.remove("hidden");

    startTimer();
    animate();
}

/* DESKTOP CONTROLS */
window.addEventListener("keydown", (e) => {
    if (e.key === "a") player.velocity.x = -speed;
    if (e.key === "d") player.velocity.x = speed;

    if (e.key === "w" && player.velocity.y === 0)
        player.velocity.y = -jumpForce;

    if (e.key === "s") player.shoot();

    if (e.key === "Shift") player.isBlocking = true;
});

window.addEventListener("keyup", (e) => {
    if (e.key === "a" || e.key === "d")
        player.velocity.x = 0;

    if (e.key === "Shift") player.isBlocking = false;
});

/* MOBILE CONTROLS */
function moveLeft(state) {
    player.velocity.x = state ? -speed : 0;
}

function moveRight(state) {
    player.velocity.x = state ? speed : 0;
}

function jump() {
    if (player.velocity.y === 0)
        player.velocity.y = -jumpForce;
}

function attack() {
    player.shoot();
}

function block(state) {
    player.isBlocking = state;
}