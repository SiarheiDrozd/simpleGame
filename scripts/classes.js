class Sprite {
    constructor(url, pos, size, renderSize, speed, frames, dir, once) {
        this.pos = pos;
        this.size = size;
        this.renderSize = renderSize;
        this.speed = typeof speed === 'number' ? speed : 0;
        this.frames = frames;
        this._index = 0;
        this.url = url;
        this.dir = dir || 'horizontal';
        this.once = once;
    }

    update(dt) {
        this._index += this.speed * dt;
    }

    render(ctx) {
        let frame;

        if (this.speed > 0) {
            let max = this.frames.length;
            let idx = Math.floor(this._index);
            frame = this.frames[idx % max];

            if (this.once && idx >= max) {
                this.done = true;
                return;
            }
        } else {
            frame = 0;
        }


        let x = this.pos[0];
        let y = this.pos[1];

        if (this.dir == 'vertical') {
            y += frame * this.size[1];
        } else {
            x += frame * this.size[0];
        }

        ctx.drawImage(resources.get(this.url),
            x, y,
            this.size[0], this.size[1],
            0, 0,
            this.renderSize[0], this.renderSize[1]);
    }
}

class GameObject {
    constructor(pos, sprite, speed = 0) {
        this.pos = pos;
        this.sprite = sprite;
        this.speed = speed;
    }
}

class PlayerCharacter extends GameObject {
    constructor(pos, sprite){
        super(pos, sprite);
        this.maxSpeed = 300;
        this.gravitySpeed = 0;
        this.gravity = 35;
        this.jumpPower = 800;
        this.friction = 0.8;
        this.ground = canvas.height - 50;
        this.direction = 'FORWARD';
        this.grounded = false;
    }

    useGravity (dt, entities) {
        //define the floor
        let highestPoint = canvas.height - 50;
        if (entities.length > 0) {
            for (let i = 0; i < entities.length; i++) {
                if (entities[i].pos[0] <= this.pos[0] + 90 // character x pos + 90 as latest visible pixel
                    && entities[i].pos[0] + 100 >= this.pos[0] + 40 // same but first visible pixel
                    && entities[i].pos[1] >= this.pos[1] + this.sprite.size[1]
                    && entities[i].pos[1] < highestPoint) {
                    highestPoint = entities[i].pos[1];
                }
            }
        }
        this.ground = highestPoint;

        // if has no floor - go fly
        if (this.pos[1] + this.sprite.size[1] < this.ground) {
            this.grounded = false;
        }

        // find ground if flying
        if (!this.grounded) {
            this.gravitySpeed += this.gravity;
            this.pos[1] += this.gravitySpeed * dt;
            this.getGround();
        }
    }

    getGround () {
        if (this.pos[1] >= this.ground - this.sprite.size[1]) {
            this.pos[1] = this.ground - this.sprite.size[1];

            this.friction = 0.8;
            this.grounded = true;
            this.gravitySpeed = 0;
        } else {
            this.grounded = false;
        }
    }

    jump () {
        this.gravitySpeed = -this.jumpPower;
        this.grounded = false;
        this.friction = 0.98;
    }
}
