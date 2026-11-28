package;

import flixel.FlxGame;
import flixel.FlxState;
#if html5
import js.Browser;
#end

class Main extends FlxGame
{
    public function new()
    {
        super(480, 270, initialState(), 60, 60, true);
    }

    static function initialState():Class<FlxState>
    {
        #if html5
        if (Browser.window.location.search.indexOf("mode=land") >= 0)
            return LandRaceState;
        #end
        return AxemRaceState;
    }
}
