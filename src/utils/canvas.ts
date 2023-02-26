import {Canvas, CanvasRenderingContext2D, createCanvas} from 'canvas'; // sudo pacman -S base-devel cairo pango libjpeg-turbo giflib libsvgtiny - https://github.com/Automattic/node-canvas/wiki
// @ts-ignore
import fs from 'fs';
// @ts-ignore
import sqlite from 'sqlite3';
import GIFEncoder from 'gifencoder';
import { createWriteStream } from 'fs';

class CustomDatabase{
    private readonly db: sqlite.Database;

    constructor() {
        this.db = new sqlite.Database('./database.db');
        // Create a table for each guild, if it doesn't exist
        this.db.run("CREATE TABLE IF NOT EXISTS guilds (id TEXT PRIMARY KEY, canvas_size INTEGER, single_pixel_size INTEGER, separator_size INTEGER, background_color TEXT, separator_color TEXT, canvasBlob TEXT)");
        // Create table for each guild set pixels, with the guild id as a foreign key, a setIndex (for the order of the pixels), the x coordinate, the y coordinate, and the color
        this.db.run("CREATE TABLE IF NOT EXISTS guilds_pixels (guild_id TEXT, setIndex INTEGER, x INTEGER, y INTEGER, color TEXT, FOREIGN KEY(guild_id) REFERENCES guilds(id))");

        // show all tables
        this.db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, rows) => {
            console.log(rows);
        });
    }

    public getDatabase(): sqlite.Database {
        return this.db;
    }

    public addGuild(guildId: string, canvasSize: number, singlePixelSize: number, separatorSize: number, backgroundColor: string, separatorColor: string) {
        this.db.run('INSERT or IGNORE INTO guilds (id, canvas_size, single_pixel_size, separator_size, background_color, separator_color) VALUES (?, ?, ?, ?, ?, ?)', [guildId, canvasSize, singlePixelSize, separatorSize, backgroundColor, separatorColor]);
        console.log(`Added guild ${guildId} to database`);
    }

    public getGuild(guildId: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM guilds WHERE id = ?', [guildId], (err, row) => {
                if(err){
                    reject(err);
                }else{
                    resolve(row);
                }
            });
        });
    }

    public getGuildPixels(guildId: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM guilds_pixels WHERE guild_id = ?', [guildId], (err, rows) => {
                if(err){
                    reject(err);
                }else{
                    resolve(rows);
                }
            });
        });
    }

    private addGuildPixelPriv(guildId: string, setIndex: number, x: number, y: number, color: string) {
        this.db.run('INSERT INTO guilds_pixels (guild_id, setIndex, x, y, color) VALUES (?, ?, ?, ?, ?)', [guildId, setIndex, x, y, color]);
    }
    public getLatestSetIndex(guildId: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT MAX(setIndex) FROM guilds_pixels WHERE guild_id = ?', [guildId], (err, row) => {
                if(err){
                    reject(err);
                }else{
                    resolve(row);
                }
            });
        });
    }
    public addGuildPixel(guildId: string, x: number, y: number, color: string) {
        // Get the last setIndex
        this.getLatestSetIndex(guildId).then((row) => {
            let setIndex = 0;
            if(row['MAX(setIndex)'] != null){
                setIndex = row['MAX(setIndex)'] + 1;
            }
            this.addGuildPixelPriv(guildId, setIndex, x, y, color);
        })
    }

}

class CustomCanvasBuilder {
    private readonly canvasSize: number;
    private readonly singlePixelSize: number;
    private readonly separatorSize: number;
    private readonly backgroundColor: string;
    private readonly separatorColor: string;
    private readonly finalCanvasSize: number;
    private readonly guildID: string;
    private canvas: Canvas;
    private ctx: CanvasRenderingContext2D;

    public constructor(canvasSize: number, singlePixelSize: number, separatorSize: number, backgroundColor: string, separatorColor: string, guildID: string) {
        try{
            // call function to add guild if it doesn't exist
            database.addGuild(guildID, canvasSize, singlePixelSize, separatorSize, backgroundColor, separatorColor);
        }catch(e){
            console.log('Error while adding guild to database: ')
            console.log(e)
        }

        this.canvasSize = canvasSize;
        this.singlePixelSize = singlePixelSize;
        this.separatorSize = separatorSize;
        this.backgroundColor = backgroundColor;
        this.separatorColor = separatorColor;
        this.guildID = guildID;

        this.finalCanvasSize = (this.singlePixelSize * this.canvasSize) + (this.separatorSize * this.canvasSize) + this.separatorSize

        const { canvas, ctx } = this.initCanvas();
        this.canvas = canvas;
        this.ctx = ctx;
    }

    private initCanvas(){
        const canvas = createCanvas(this.finalCanvasSize, this.finalCanvasSize);
        const ctx = canvas.getContext('2d')

        ctx.fillStyle = this.separatorColor;

        for (let i = 0; i < this.canvasSize+1; i++) {
            // Horizontal lines
            ctx.fillRect(0, (this.singlePixelSize * i) + (this.separatorSize * i), canvas.width, this.separatorSize)
            // Vertical lines
            ctx.fillRect((this.singlePixelSize * i) + (this.separatorSize * i), 0, this.separatorSize, canvas.height)
        }

        const horizontalOffset = {
            x: 0,
            y: this.singlePixelSize / 5
        }

        const verticalOffset = {
            x: this.singlePixelSize / 2,
            y: -20
        }

        // Set font size
        ctx.font = `${this.singlePixelSize/2}px Arial`;
        ctx.fillStyle = '#F00';

        for (let i = 1; i < this.canvasSize; i++) {
            const coordIndex = i;
            if (i == 10) {
                verticalOffset.x += 10
                horizontalOffset.x += 10
            }

            // Horizontal Numeration
            ctx.fillText(`${i}`, ((this.singlePixelSize * coordIndex) + (this.separatorSize * coordIndex) + (this.singlePixelSize / 2)) - horizontalOffset.x,  this.singlePixelSize - horizontalOffset.y)
            // Vertical Numeration
            ctx.fillText(`${i}`, this.singlePixelSize - verticalOffset.x, ((this.singlePixelSize * coordIndex) + (this.separatorSize * coordIndex) + (this.singlePixelSize / 2) - verticalOffset.y))
        }
        return {canvas: canvas, ctx: ctx}
    }

    public fillRectangle(x: number, y: number, color: string) {
        try{
            database.addGuildPixel(this.guildID, x, y, color);
        }catch (e){
            console.log('Error while adding guild pixel to database: ')
            console.log(e)
        }

        this.ctx.fillStyle = color;
        this.ctx.fillRect((this.singlePixelSize * x) + (this.separatorSize * x) + this.separatorSize, (this.singlePixelSize * y) + (this.separatorSize * y) + this.separatorSize, this.singlePixelSize, this.singlePixelSize)

        return this.canvas.toBuffer('image/png');
    }

    public async loadGuildPixels(){
        // check if guild has pixels in database
        try{
            const pixels = await database.getGuildPixels(this.guildID);
            if(pixels){
                for (let i = 0; i < pixels.length; i++) {
                    this.ctx.fillStyle = pixels[i].color;
                    const x = pixels[i].x;
                    const y = pixels[i].y;
                    this.ctx.fillRect((this.singlePixelSize * x) + (this.separatorSize * x) + this.separatorSize, (this.singlePixelSize * y) + (this.separatorSize * y) + this.separatorSize, this.singlePixelSize, this.singlePixelSize)
                }
            }
        }catch (e) {
            console.log('Error while getting guild pixels from database: ')
            console.log(e)
        }
    }

    public getCanvasSize() {
        return this.canvasSize - 1;
    }

    public getCanvasBuffer(){
        return this.canvas.toBuffer('image/png');
    }

    public async getCanvasAnimationBuffer(){
        // Get all pixels placements from database
        const pixels = await database.getGuildPixels(this.guildID);
        const { canvas, ctx } = this.initCanvas();
        // create array of CanvasRenderingContext2D objects
        const animationFrames = [] as CanvasRenderingContext2D[];
        if(pixels){
            for (let i = 0; i < pixels.length; i++) {
                ctx.fillStyle = pixels[i].color;
                const x = pixels[i].x;
                const y = pixels[i].y;
                ctx.fillRect((this.singlePixelSize * x) + (this.separatorSize * x) + this.separatorSize, (this.singlePixelSize * y) + (this.separatorSize * y) + this.separatorSize, this.singlePixelSize, this.singlePixelSize)
                animationFrames.push(ctx);
            }

            //TODO create gif @Trip do your bizwizardry here!!
            // hello
            // hey uwu
            no u
            // can you push to git 
            return null;
        }
    }
}

let canvasArray: CustomCanvasBuilder[] = [];
const database = new CustomDatabase();

async function getCanvas(serverID: any){
    console.log('Getting canvas for server: ' + serverID)
    if (canvasArray[serverID] == undefined) {
        canvasArray[serverID] = await new CustomCanvasBuilder(16, 64, 8, '#000000', '#444444', serverID)
    }

    await canvasArray[serverID].loadGuildPixels();

    return canvasArray[serverID];
}

module.exports = {
    getCanvas
}
