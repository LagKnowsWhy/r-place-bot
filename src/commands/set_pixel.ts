import { SlashCommandBuilder, EmbedBuilder, RGBTuple } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
// @ts-ignore
import { fillRectangle, getCanvasInfo }  from '../utils/canvas';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_pixel')
        .setDescription('Sets a pixel on the canvas.')
        .addIntegerOption(option => option.setName('x').setDescription('The x coordinate of the pixel.').setRequired(true))
        .addIntegerOption(option => option.setName('y').setDescription('The y coordinate of the pixel.').setRequired(true))
        .addStringOption(option => option.setName('color').setDescription('The color of the pixel.').setRequired(true).addChoices(
            { name: 'Red', value: 'red' },
            { name: 'Green', value: 'green' },
            { name: 'Blue', value: 'blue' },
            { name: 'Yellow', value: 'yellow' },
            { name: 'Cyan', value: 'cyan' },
            { name: 'Magenta', value: 'magenta' },
            { name: 'White', value: 'white' },
            { name: 'Black', value: 'black' },
            { name: 'Gray', value: 'gray' },
            { name: 'Brown', value: 'brown' },
        )),



    // Give me 10 colors:
    // Red, Green, Blue, Yellow, Cyan, Magenta, White, Black, Gray, Brown
    // - Red: 255, 0, 0
    // - Green: 0, 255, 0
    // - Blue: 0, 0, 255
    // - Yellow: 255, 255, 0
    // - Cyan: 0, 255, 255
    // - Magenta: 255, 0, 255
    // - White: 255, 255, 255
    // - Black: 0, 0, 0
    // - Gray: 128, 128, 128
    // - Brown: 165, 42, 42


    async execute(interaction: CommandInteraction) {
        // @ts-ignore
        const pixelX = interaction.options.getInteger('x');
        // @ts-ignore
        const pixelY = interaction.options.getInteger('y');
        // @ts-ignore
        const pixelColor = interaction.options.getString('color');
        console.log(`Setting pixel at ${pixelX}, ${pixelY} to ${pixelColor}`)

        const buffer = fillRectangle(pixelX, pixelY, pixelColor)


        const canvasSize = getCanvasInfo();
        console.log(`Canvas size: ${canvasSize}`)

        if (pixelX > canvasSize)
            return await interaction.reply({ content: `The x coordinate must be between 1 and ${canvasSize}`, ephemeral: true });
        if (pixelY > canvasSize)
            return await interaction.reply({ content: `The y coordinate must be between 1 and ${canvasSize}`, ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('Pixel set!')
            .setDescription(`Set pixel at ${pixelX}, ${pixelY} to ${pixelColor}`)
            .setImage('attachment://canvas.png')

        return await interaction.reply({ embeds: [embed], files: [{ name: 'canvas.png', attachment: buffer }] });
    }
}