import { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, CloudSnow, AlertCircle } from 'lucide-react';
import { usePluginStore } from '../plugins';

interface WeatherData {
    temp: number;
    unit: string;
    code: number;
}

export function WeatherWidget() {
    const [data, setData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Get settings from store
    const { installed } = usePluginStore();
    const weatherPlugin = installed.get('weather');
    const settings = weatherPlugin?.enabled ? (weatherPlugin as any).settings : {};

    // Defaults if settings are missing
    const zipCode = settings?.zipCode || '10001';
    const countryCode = settings?.countryCode || 'US';
    const unit = settings?.unit || 'fahrenheit';

    const getCoordinates = async (zip: string, country: string) => {
        try {
            const res = await fetch(`https://api.zippopotam.us/${country}/${zip}`);
            if (!res.ok) throw new Error('Invalid Zip Code or Country');
            const json = await res.json();
            return {
                lat: json.places[0].latitude,
                lon: json.places[0].longitude
            };
        } catch (e) {
            console.error('Geocoding failed:', e);
            throw e;
        }
    };

    const fetchWeather = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);

            // 1. Geocode
            const { lat, lon } = await getCoordinates(zipCode, countryCode);

            // 2. Fetch Weather
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=${unit}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch weather');
            const json = await res.json();

            setData({
                temp: json.current.temperature_2m,
                unit: json.current_units.temperature_2m,
                code: json.current.weather_code
            });
        } catch (e) {
            console.error(e);
            setErrorMsg(e instanceof Error ? e.message : 'Unknown Error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeather();
        // Refresh every 30 mins
        const interval = setInterval(fetchWeather, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, [zipCode, countryCode, unit, weatherPlugin?.enabled]); // Re-fetch when settings change

    if (errorMsg) return (
        <div className="flex items-center gap-1 text-xs text-red-400 cursor-help" title={`Error: ${errorMsg}. Check settings.`}>
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Error</span>
        </div>
    );

    if (loading && !data) return <span className="animate-pulse text-xs text-muted-foreground">Loading...</span>;
    if (!data) return null;

    let Icon = Sun;
    if (data.code > 3) Icon = Cloud;
    if (data.code >= 51) Icon = CloudRain;
    if (data.code >= 71) Icon = CloudSnow;
    if (data.code >= 95) Icon = CloudLightning;

    return (
        <div
            className="flex items-center gap-1.5 cursor-pointer text-foreground-muted hover:text-foreground transition-colors select-none"
            onClick={fetchWeather}
            title={`Click to refresh (${zipCode}, ${countryCode})`}
        >
            <Icon className="w-3.5 h-3.5" />
            <span>{data.temp}{data.unit}</span>
        </div>
    );
}
