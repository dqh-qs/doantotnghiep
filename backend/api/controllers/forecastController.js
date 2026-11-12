import * as ForecastModel from "../models/forecastModel.js";

export async function getLatest(req, res) {
    try {
        res.json(await ForecastModel.getLatestAll());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function getOverview(req, res) {
    try {
        res.json(await ForecastModel.getForecastOverview());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function getStationForecast(req, res) {
    try {
        const hours = req.query.hours ? Number(req.query.hours) : 24;
        res.json(await ForecastModel.getStationForecast(req.params.id, hours));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function getHistory(req, res) {
    try {
        const { station_id, from, to } = req.query;
        res.json(await ForecastModel.getForecastHistory({ station_id, from, to }));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function getAccuracy(req, res) {
    try {
        const { model_name, station_id } = req.query;
        res.json(await ForecastModel.getAccuracy({ model_name, station_id }));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function predict(req, res) {
    try {
        const { station_id, hours } = req.body;
        const result = await ForecastModel.triggerPythonForecast(station_id, hours || 24);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
