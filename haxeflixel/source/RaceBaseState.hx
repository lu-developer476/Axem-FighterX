package;

import flixel.FlxG;
import flixel.FlxState;
import flixel.FlxSprite;
import flixel.text.FlxText;
import flixel.util.FlxColor;
import openfl.utils.Assets;
#if html5
import js.Browser;
#end

class RaceBaseState extends FlxState
{
    public var paused:Bool = false;
    public var status:FlxText;
    public var detail:FlxText;
    var backgroundA:FlxSprite;
    var backgroundB:FlxSprite;

    override public function create():Void
    {
        super.create();
        FlxG.mouse.visible = false;
    }

    /** Devuelve todos los mapas embebidos de una modalidad, ordenados por ruta. */
    public function discoverMapAssets(category:String):Array<String>
    {
        var prefix = "assets/maps/minigames/" + category + "/";
        var images = Assets.list().filter(function(assetPath:String):Bool
        {
            var normalized = assetPath.toLowerCase();
            return StringTools.startsWith(normalized, prefix)
                && (StringTools.endsWith(normalized, ".png")
                    || StringTools.endsWith(normalized, ".webp")
                    || StringTools.endsWith(normalized, ".jpg")
                    || StringTools.endsWith(normalized, ".jpeg"));
        });
        images.sort(function(left:String, right:String):Int
        {
            return Reflect.compare(left.toLowerCase(), right.toLowerCase());
        });
        return images;
    }

    /** Convierte la ruta relativa del mapa en un rótulo para la pantalla de selección. */
    public function displayMapName(assetPath:String, category:String):String
    {
        var prefix = "assets/maps/minigames/" + category + "/";
        var label = StringTools.startsWith(assetPath, prefix)
            ? assetPath.substr(prefix.length)
            : assetPath;
        var extensionIndex = label.lastIndexOf(".");
        if (extensionIndex >= 0) label = label.substr(0, extensionIndex);
        label = StringTools.replace(label, "/", " · ");
        label = StringTools.replace(label, "-", " ");
        label = StringTools.replace(label, "_", " ");
        return label.toUpperCase();
    }

    /** Crea el fondo la primera vez y reutiliza ambos sprites al cambiar de mapa. */
    public function addBackground(assetPath:String):Void
    {
        if (backgroundA == null)
        {
            backgroundA = new FlxSprite(0, 0);
            backgroundB = new FlxSprite(FlxG.width, 0);
            add(backgroundA);
            add(backgroundB);
        }

        backgroundA.loadGraphic(Assets.getBitmapData(assetPath));
        backgroundA.setGraphicSize(FlxG.width, FlxG.height);
        backgroundA.updateHitbox();
        backgroundA.antialiasing = false;

        backgroundB.loadGraphic(Assets.getBitmapData(assetPath));
        backgroundB.setGraphicSize(FlxG.width, FlxG.height);
        backgroundB.updateHitbox();
        backgroundB.antialiasing = false;
        backgroundB.x = FlxG.width;
    }

    public function scrollBackground(distance:Float, factor:Float = 0.14):Void
    {
        var offset = (distance * factor) % FlxG.width;
        backgroundA.x = -offset;
        backgroundB.x = FlxG.width - offset;
    }

    public function addLabel(x:Float, y:Float, width:Float, value:String, size:Int = 8, color:FlxColor = FlxColor.WHITE):FlxText
    {
        var label = new FlxText(x, y, width, value, size);
        label.setFormat(null, size, color, "center");
        label.scrollFactor.set(0, 0);
        add(label);
        return label;
    }

    public function addHeader(title:String, controls:String):Void
    {
        status = addLabel(8, 7, 464, title, 10, FlxColor.WHITE);
        detail = addLabel(8, 20, 464, controls, 7, FlxColor.fromRGB(210, 220, 232));
    }

    public function loadAnimatedSprite(assetPath:String, x:Float, y:Float, frameWidth:Int, frameHeight:Int, animationName:String, frameRate:Int):FlxSprite
    {
        var sprite = new FlxSprite(x, y);
        sprite.loadGraphic(Assets.getBitmapData(assetPath), true, frameWidth, frameHeight);
        sprite.antialiasing = false;
        var frames:Array<Int> = [];
        for (index in 0...sprite.numFrames) frames.push(index);
        if (frames.length > 0)
        {
            sprite.animation.add(animationName, frames, frameRate, true);
            sprite.animation.play(animationName);
        }
        add(sprite);
        return sprite;
    }

    public function commonInput():Bool
    {
        if (FlxG.keys.justPressed.ESCAPE)
        {
            exitToMenu();
            return true;
        }
        if (FlxG.keys.justPressed.P)
        {
            paused = !paused;
            detail.text = paused ? "PAUSA · P PARA CONTINUAR · ESC PARA SALIR" : "P PAUSA · ESC MENÚ";
            if (FlxG.sound.music != null)
            {
                if (paused) FlxG.sound.music.pause();
                else FlxG.sound.music.resume();
            }
        }
        return paused;
    }

    public function exitToMenu():Void
    {
        #if html5
        Browser.window.parent.postMessage({ type: "axem-minigame-exit" }, "*");
        #else
        FlxG.switchState(new AxemRaceState());
        #end
    }

    /** Notifica al contenedor que HaxeFlixel arrancó y cuántos mapas encontró. */
    public function notifyMinigameReady(mode:String, mapCount:Int):Void
    {
        #if html5
        Browser.window.parent.postMessage({
            type: "axem-minigame-ready",
            mode: mode,
            mapCount: mapCount
        }, "*");
        #end
    }

    public function clamp(value:Float, minimum:Float, maximum:Float):Float
    {
        return Math.max(minimum, Math.min(maximum, value));
    }
}
