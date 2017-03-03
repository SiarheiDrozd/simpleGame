/**
 * Created by Siarhei Drozd on 19.11.2016.
 */

'use strict';

let requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

//resources.js and sprite.js are from habr example
resources.load([
    'img/character.png',
    'img/background/backgroundDeep0.png',
    'img/background/backgroundDeep1.png',
    'img/background/backgroundDeep2.png',
    'img/background/backgroundDeep3.png',
    'img/background/backgroundDeep4.png',
    'img/coins.png',
    'img/crate.png',
    'img/crow.png',
    'img/hearts.png',
    'img/score.png',
    'img/rat.png',
]);
resources.onReady(init);

/*****************************
 *
 *          GLOBAL GAME VARIABLES
 *
 * */

const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const showMenu = document.querySelector('#menu');
const showGameOver = document.querySelector('#gameOver');

//buttons
const restartButton = document.querySelector('#playAgain');
const startButton = document.querySelector('#start');
const resumeButton = document.querySelector('#resume');
const nextLevel = document.querySelector('#nextLevel');
const options = document.querySelector('#options');
const shop = document.querySelector('#shop');
const buyLifeButton = document.querySelector('#buyLifeButton');
const soundVolume = document.querySelector('#soundVolume');
const soundOnOff = document.querySelector('#soundOnOff');
const soundEff = document.querySelector('#soundEff');

// game constants
const LIFE_PRICE = 15;
const JUMP_SOUND = new Audio("music/Jump.wav");
const HURT_SOUND = new Audio("music/Hit_Hurt.wav");
const COIN_SOUND = new Audio("music//Pickup_Coin.wav");
const DISTANCE_COEFFICIENT = 2;
const PLAYER_START_POSITION = [0, 0];

// gameState variables
let score = 0;
let isGameOver = true;
let lastTime;
let timePoint = 0;
let gameTime = 0;
let stopGame = true;
let inputs;
let globalGameSpeed = 0;
let maxSpeed = 200;
let speedIncreaser = 10;
let distance = 0;
let targetDistance = 10000;
let bgMusic;
let soundEffects = false;

// gamePlay variables
let backgroundLayers = [];
let coins = [];
let crates = [];
let enemies = [];
let UI = [];
let livesCount = 3;

let coinsCount = 0;
let player;
let playerHited = false;
let hitTime = 0;

let lives;
let time;
let coinsDisplay;

/*****************************
 *
 *          MAIN FUNCTIONS
 *
 * */
function init() {
    window.addEventListener('keydown', function (e) {
        if (e.which === 27) {
            if (!isGameOver) {
                displayMenu();
            }
        }
    });
    window.addEventListener('keydown', function (e) {
        inputs = (inputs || []);
        inputs[e.keyCode] = true;
    });
    window.addEventListener('keyup', function (e) {
        if (inputs) {
            inputs[e.keyCode] = false;
        }
    });

    globalGameSpeed = maxSpeed / 10;

    initAudio();

    stopGame = true;
    isGameOver = true;

    canvas.focus();

    initPlayer();
    initBackgrounds();

    //render background for better look on start
    backgroundLayers.forEach((bgLayers => renderEntities(bgLayers)));
    buttonsEvents();

}

function main() {
    let now = Date.now();
    let dt = (now - lastTime) / 1000.0;
    if (!stopGame && !isGameOver) {
        update(dt);
        render();
    }
    lastTime = now;
    requestAnimFrame(main);
}

function reset() {
    distance = 0;
    isGameOver = false;
    lastTime = Date.now();
    backgroundLayers = [];
    gameTime = 0;
    score = 0;
    globalGameSpeed = 100;
    timePoint = 0;

    coinsCount = 0;
    livesCount = 3;

    crates = [];
    coins = [];
    enemies = [];

    player.pos = [0, 0];
    player.speed = 0;
    playerHited = true;
    hitTime = 0;
    stopGame = false;

    initBackgrounds();
}

function resetStage() {
    distance = 0;
    targetDistance *= DISTANCE_COEFFICIENT;
    lastTime = Date.now();
    gameTime = 0;
    globalGameSpeed = maxSpeed / 10;
    speedIncreaser *= DISTANCE_COEFFICIENT;
    timePoint = 0;
    maxSpeed = ~~(maxSpeed * DISTANCE_COEFFICIENT);

    crates = [];
    coins = [];
    enemies = [];

    player.pos = [0, 0];
    player.speed = 0;
    playerHited = true;
    hitTime = 0;
}

function update(dt) {
    gameTime += dt;
    distance += globalGameSpeed * dt;

    if(targetDistance - distance <= 0){
        displayMenu();
        resumeButton.style.display = 'none';
        nextLevel.style.display = 'block';
    }

    // increase game speed
    if (gameTime - timePoint >= 1 && globalGameSpeed < maxSpeed) {
        globalGameSpeed += speedIncreaser;
        timePoint = gameTime;
    }

    updateBackgrounds(dt);
    updateCrate(dt);
    movesPlayer(dt);

    updateCoin(dt);
    updateEnemies(dt);

    player.useGravity(dt, crates);
    player.sprite.update(dt);

    updateUI(dt);


}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    backgroundLayers.forEach((bgLayers => renderEntities(bgLayers)));
    renderEntities(crates);
    renderEntities(coins);

    renderEntities(enemies);

    renderPlayer();

    renderEntities(UI);
    renderCounters();
}

function gameOver() {
    displayMenu();
    resumeButton.style.display = 'none';
    showGameOver.style.display = 'block';
    shop.style.display = 'none';
    options.style.display = 'none';
    isGameOver = true;
}

function buttonsEvents() {
    restartButton.addEventListener('click', function () {
        displayMenu();
        reset();
        showGameOver.style.display = 'none';
        resumeButton.style.display = 'block';
        shop.style.display = 'block';
        options.style.display = 'block';
        buyLifeButton.innerHTML = `1 Life = ${LIFE_PRICE} coins (${livesCount})`;
    });

    resumeButton.addEventListener('click', function () {
        displayMenu();
    });

    buyLifeButton.addEventListener('click', function () {
        if (livesCount < 6 && coinsCount >= LIFE_PRICE) {
            livesCount += 1;
            coinsCount -= LIFE_PRICE;
            buyLifeButton.innerHTML = `1 Life = ${LIFE_PRICE} coins (${livesCount})`;
        }
    });

    startButton.addEventListener('click', function () {
        lastTime = Date.now();
        isGameOver = false;
        displayMenu();
        main();
        startButton.style.display = 'none';
        restartButton.style.display = 'block';
        resumeButton.style.display = 'block';
        shop.style.display = 'block';
        options.style.display = 'block';
        buyLifeButton.innerHTML = `1 Life = ${LIFE_PRICE} coins (${livesCount})`;
        bgMusic.volume = .1;
    });

    nextLevel.addEventListener('click', function () {
        displayMenu();
        nextLevel.style.display = 'none';
        restartButton.style.display = 'block';
        resumeButton.style.display = 'block';

        // next level changes
        resetStage();
    });

    soundVolume.addEventListener('change', function () {
        bgMusic.volume = soundVolume.value;
        COIN_SOUND.volume = soundVolume.value;
        JUMP_SOUND.volume = soundVolume.value;
        HURT_SOUND.volume = soundVolume.value;
    });

    soundOnOff.addEventListener('change', function () {
        if (soundOnOff.checked) {
            bgMusic.play();
        } else {
            bgMusic.pause();
        }
    });

    soundEff.addEventListener('change', function () {
        soundEffects = !soundEffects;
    })
}

/*****************************
 *
 *          BACKGROUND
 *
 * */
const initBackgrounds = function () {
    backgroundLayers[0] = [
        new GameObject(
            [0, 0],
            new Sprite(
                'img/background/backgroundDeep0.png',
                [0, 0],
                [canvas.width, canvas.height],
                [canvas.width, canvas.height],
                0,
                [0]
            )
        )
    ];
    backgroundLayers[2] = [
        new GameObject(
            [0, 0],
            new Sprite(
                'img/background/backgroundDeep1.png',
                [0, 0],
                [canvas.width, canvas.height],
                [canvas.width, canvas.height],
                0,
                [0]
            )
        ),
        new GameObject(
            [canvas.width, 0],
            new Sprite(
                'img/background/backgroundDeep1.png',
                [0, 0],
                [canvas.width, canvas.height],
                [canvas.width, canvas.height],
                0,
                [0]
            )
        )
    ];
    backgroundLayers[1] = [
        new GameObject(
            [0, 0],
            new Sprite(
                'img/background/backgroundDeep2.png',
                [0, 0],
                [canvas.width, canvas.height],
                [canvas.width, canvas.height],
                0,
                [0]
            )
        ),
        new GameObject(
            [canvas.width, 0],
            new Sprite(
                'img/background/backgroundDeep2.png',
                [0, 0],
                [canvas.width, canvas.height],
                [canvas.width, canvas.height],
                0,
                [0]
            )
        )
    ];
    backgroundLayers[3] = [
        new GameObject(
            [0, 0],
            new Sprite(
                'img/background/backgroundDeep3.png',
                [0, 0],
                [canvas.width, canvas.height],
                [canvas.width, canvas.height],
                0,
                [0]
            )
        ),
        new GameObject(
            [canvas.width, 0],
            new Sprite(
                'img/background/backgroundDeep3.png',
                [0, 0],
                [canvas.width, canvas.height],
                [canvas.width, canvas.height],
                0,
                [0]
            )
        )
    ];
    backgroundLayers[4] = [
        new GameObject(
            [0, 0],
            new Sprite(
                'img/background/backgroundDeep4.png',
                [0, 0],
                [canvas.width, canvas.height],
                [canvas.width, canvas.height],
                0,
                [0]
            )
        ),
        new GameObject(
            [canvas.width, 0],
            new Sprite(
                'img/background/backgroundDeep4.png',
                [0, 0],
                [canvas.width, canvas.height],
                [canvas.width, canvas.height],
                0,
                [0]
            )
        )
    ];
};

function updateBackgrounds(dt) {
    const bgLen = backgroundLayers.length;
    for (let i = 1; i < bgLen; i++) {
        for (let j = 0; j < backgroundLayers[i].length; j++) {
            backgroundLayers[i][j].pos[0] -= globalGameSpeed * dt / (bgLen - i);

            if (backgroundLayers[i][j].pos[0] + backgroundLayers[i][j].sprite.size[0] <= 0) {
                let opposite = Math.abs(j - 1);
                backgroundLayers[i][j].pos[0] = backgroundLayers[i][opposite].pos[0] +
                    backgroundLayers[i][opposite].sprite.size[0] - globalGameSpeed * dt / (bgLen - i);
            }
        }
    }
}
/*****************************
 *
 *          UI
 *
 * */
function displayMenu() {
    if (stopGame) {
        showMenu.style.display = 'none';
        stopGame = !stopGame;
    } else {
        showMenu.style.display = 'flex';
        stopGame = !stopGame;
    }
}

function updateUI(dt) {
    if (!lives) {
        lives = new GameObject([10, 30],
            new Sprite('img/hearts.png', [0, 0], [livesCount * 90, 90], [livesCount * 50, 50], 0));
        UI.push(lives);
    } else {
        lives.sprite.size[0] = livesCount * 90;
        lives.sprite.renderSize[0] = livesCount * 50;
    }
    if (!time) {
        time = new GameObject([315, 0],
            new Sprite('img/score.png', [0, 0], [170, 100], [170, 100], 0, [0]));
        UI.push(time);
    }
    if (!coinsDisplay) {
        coinsDisplay = new GameObject(
            [600, 30],
            new Sprite('img/coins.png', [0, 0], [40, 43], [30, 32], 6, [0, 1, 2, 3, 4, 5], 'vertical')
        );
        UI.push(coinsDisplay);
    } else {
        coinsDisplay.sprite.update(dt);
    }
}

function renderCounters() {
    // coins count
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`x ${coinsCount}`, 640, 60);

    //passed time
    ctx.font = 'bold 30px DoppioOne, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${~~gameTime}s`, 400, 70);

    // distance left
    ctx.font = 'bold 22px DoppioOne, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${~~((targetDistance - distance) / 100)} meters left`, 400, 35);
}

function initAudio() {
    bgMusic = new Audio("music/madness.mp3");
    bgMusic.volume = soundVolume.value;
    bgMusic.loop = true;
}

/*****************************
 *
 *          ENTITIES
 *
 * */
function initPlayer() {
    player = new PlayerCharacter(
        PLAYER_START_POSITION,
        new Sprite('img/character.png', [0, 0], [104, 150], [104, 150], 9, [0, 1, 2, 3, 4, 5])
    );
}

function renderEntities(list) {
    for (let i = 0; i < list.length; i++) {
        renderEntity(list[i]);
    }
}

function renderEntity(entity) {
    ctx.save();
    ctx.translate(entity.pos[0], entity.pos[1]);
    entity.sprite.render(ctx);
    ctx.restore();
}

function renderPlayer() {
    //blinking when hit
    if (playerHited) {
        let timeAmount = gameTime - hitTime;
        if (timeAmount < 2) {
            if ((timeAmount % 1 >= 0 && timeAmount % 1 <= 0.2)
                || (timeAmount % 1 > 0.4 && timeAmount % 1 <= 0.6)
                || (timeAmount % 1 > 0.75 && timeAmount % 1 <= 0.9)) {

                ctx.globalAlpha = 0.3;
            } else {
                ctx.globalAlpha = 1;
            }
        } else {
            playerHited = false;
        }
    }

    renderEntity(player);
    ctx.globalAlpha = 1;
}

function movesPlayer(dt) {
    impulse();
    if (inputs && (inputs[37] || inputs[65])) {
        player.speed = -player.maxSpeed - globalGameSpeed / 2;
        player.direction = "BACKWARD";
    }
    if (inputs && (inputs[39] || inputs[68])) {
        player.speed = player.maxSpeed + globalGameSpeed;
        player.direction = "FORWARD";
    }
    if (inputs && (inputs[83] || inputs[40])) {
        player.pos[1] += 5;
    }
    if (inputs && (inputs[38] || inputs[87]) && player.grounded) {
        if (soundEffects){
            JUMP_SOUND.play();
        }
        player.jump();
    }
    player.direction === "FORWARD" ? player.sprite.pos = [0, 0] : player.sprite.pos = [0, 150];

    // extend sprite control
    if (player.grounded) {
        if (player.speed !== 0) {
            player.sprite.speed = 9;
        } else {

            player.sprite.speed = 0;
            switch (player.direction) {
                case "FORWARD" :
                    player.sprite.pos = [0, 301];
                    break;
                case "BACKWARD" :
                    player.sprite.pos = [104, 301];
                    break;
                default :
                    player.sprite.pos = [0, 0];
            }
        }
    } else {
        player.sprite.speed = 0;
    }

    player.pos[0] += (player.speed - globalGameSpeed) * dt;

    checkPlayerBounds();
}

function impulse() {
    player.speed *= player.friction;

    if (player.speed > -10 && player.speed < 10) {
        player.speed = 0;
        player.sprite.speed = 0;
    }
}

function checkPlayerBounds() {
    // Check bounds
    if (player.pos[0] < 0) {
        player.pos[0] = 0;
    }
    else if (player.pos[0] > canvas.width - player.sprite.size[0]) {
        player.pos[0] = canvas.width - player.sprite.size[0];
    }

    if (player.pos[1] < 0) {
        player.pos[1] = 0;
    }
    else if (player.pos[1] > canvas.height - player.sprite.size[1] - 50) {
        player.pos[1] = canvas.height - player.sprite.size[1] - 50;
    }
}

function updateCoin(dt) {
    if (Math.random() < 0.01) {
        coins.push(
            new GameObject(
                [canvas.width, 100 + Math.random() * (canvas.height - 200)],
                new Sprite('img/coins.png', [0, 0], [40, 43], [40, 43], 6, [0, 1, 2, 3, 4, 5], 'vertical')
            )
        );
    }
    for (let i = 0; i < coins.length; i++) {
        coins[i].pos[0] -= globalGameSpeed * dt;
        coins[i].sprite.update(dt);

        // Remove if offscreen
        if (coins[i].pos[0] + coins[i].sprite.size[0] < 0) {
            coins.splice(i, 1);
            i -= 1;
        }
        if (coins[i] && checkCollision(coins[i], player)) {
            coinsCount += 1;
            if (soundEffects){
                COIN_SOUND.currentTime = 0;
                COIN_SOUND.play();
            }
            coins.splice(i, 1);
            i -= 1;
        }
    }
}

function updateCrate(dt) {
    if (crates.length < 5) {
        let posX = canvas.width;
        let posY = 0;
        if (crates.length > 0) {
            posX += Math.random() * canvas.width;

            crates.forEach(crate => {
                if (crate.pos[0] > canvas.width
                    && crate.pos[0] <= posX
                    && posX <= crate.pos[0] + 50) {

                    posY = 100;
                } else {
                    if ((crate.pos[0] <= posX && posX <= crate.pos[0] + 100)
                        || (crate.pos[0] >= posX && posX + 100 >= crate.pos[0])
                    ) {
                        posX = crate.pos[0] + 100;
                    }
                }
            });
        }

        crates.push(
            new GameObject(
                [posX, canvas.height - 160 - posY],
                new Sprite(
                    'img/crate.png',
                    [0, 0],
                    [100, 100],
                    [100, 100],
                    0,
                    [0]
                )
            )
        );
    }
    for (let i = 0; i < crates.length; i++) {
        crates[i].pos[0] -= globalGameSpeed * dt;

        // Remove if offscreen
        if (crates[i].pos[0] + crates[i].sprite.size[0] < 0) {
            crates.splice(i, 1);
            i -= 1;
        }
    }
}

function updateEnemies(dt) {
    //generate Crows
    if (Math.random() < 0.005) {
        let crowSpeed = 100 + Math.random() * 100;
        enemies.push(
            new GameObject(
                [canvas.width, Math.random() * (canvas.height / 4)],
                new Sprite('img/crow.png', [0, 0], [96, 115], [96, 115], crowSpeed / 16, [0, 1, 2, 3]),
                crowSpeed
            )
        );
    }
    if (Math.random() < 0.005) {
        let mouseSpeed = 100 + Math.random() * 100;
        enemies.push(
            new GameObject(
                [canvas.width, canvas.height - 50 - 30],
                new Sprite('img/rat.png', [0, 0], [190, 60], [95, 30], mouseSpeed / 16, [0, 1, 2, 3, 4], 'vertical'),
                mouseSpeed
            )
        );
    }
    for (let i = 0; i < enemies.length; i++) {
        enemies[i].pos[0] -= (enemies[i].speed + globalGameSpeed) * dt;
        enemies[i].sprite.update(dt);

        // Remove if offscreen
        if (enemies[i].pos[0] + enemies[i].sprite.size[0] < 0) {
            enemies.splice(i, 1);
            i -= 1;
        }
        if (enemies[i] && checkCollision(enemies[i], player)) {
            //globalGameSpeed = ~~globalGameSpeed / 2;
            if (!playerHited) {
                if (livesCount > 1) {
                    livesCount -= 1;
                    hitTime = gameTime;
                    playerHited = true;
                    buyLifeButton.innerHTML = `1 Life = ${LIFE_PRICE} coins (${livesCount})`;
                    if (soundEffects){
                        HURT_SOUND.play();
                    }
                } else {
                    livesCount -= 1;
                    if (soundEffects){
                        HURT_SOUND.play();
                    }
                    gameOver();
                }
                enemies.splice(i, 1);
                i -= 1;
            }
        }
    }
}

function checkCollision(entity1, entity2) {
    let playerBoundaryLeft = 0;
    let playerBoundaryRight = 0;

    // special boundaries for player
    if (entity2 instanceof PlayerCharacter) {
        playerBoundaryLeft = 20;
        playerBoundaryRight = 20;
    }

    let rect1Left = entity1.pos[0];
    let rect1Right = entity1.pos[0] + entity1.sprite.renderSize[0];
    let rect1Top = entity1.pos[1];
    let rect1Bottom = entity1.pos[1] + entity1.sprite.renderSize[1];

    let rect2Left = entity2.pos[0] + playerBoundaryLeft;
    let rect2Right = entity2.pos[0] + entity2.sprite.renderSize[0] - playerBoundaryRight;
    let rect2Top = entity2.pos[1];
    let rect2Bottom = entity2.pos[1] + entity2.sprite.renderSize[1];

    let overlap = false;
    let overlapRect1Left = false;
    let overlapRect1Right = false;
    let overlapRect1Top = false;
    let overlapRect1Bottom = false;

    if ((rect1Left <= rect2Right) && (rect1Left >= rect2Left)) {
        overlapRect1Left = true;
    }
    if ((rect1Right <= rect2Right) && (rect1Right >= rect2Left)) {
        overlapRect1Right = true;
    }
    if ((rect1Top >= rect2Top) && (rect1Top <= rect2Bottom)) {
        overlapRect1Top = true;
    }
    if ((rect1Bottom >= rect2Top) && (rect1Top <= rect2Bottom)) {
        overlapRect1Bottom = true;
    }
    if ((overlapRect1Left && overlapRect1Top) || (overlapRect1Left && overlapRect1Bottom)) {
        overlap = true;
    }
    if ((overlapRect1Right && overlapRect1Top) || (overlapRect1Right && overlapRect1Bottom)) {
        overlap = true;
    }
    if ((rect1Right <= rect2Right) && (rect1Left >= rect2Left) && (rect1Top >= rect2Top) && (rect1Bottom <= rect2Bottom)) {
        overlap = true;
    }
    if ((rect1Right >= rect2Right) && (rect1Left <= rect2Left) && (rect1Top <= rect2Top) && (rect1Bottom >= rect2Bottom)) {
        overlap = true;
    }
    return overlap;
}

