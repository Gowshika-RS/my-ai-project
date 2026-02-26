

# import pandas as pd
# import numpy as np
# from sklearn.cluster import KMeans

# def calculate_risk(df, lat, lon):

#     # Distance calculation
#     df["distance"] = np.sqrt(
#         (df["latitude"] - lat)**2 +
#         (df["longitude"] - lon)**2
#     )

#     nearby = df[df["distance"] < 0.03]

#     if nearby.empty:
#         return 5, "Safe Area", "Very low crime records."

#     frequency = len(nearby)
#     avg_severity = nearby["severity"].mean()

#     night_crime = len(nearby[nearby["time"] == "Night"])

#     risk_score = (frequency * 0.5) + (avg_severity * 0.3) + (night_crime * 0.2)
#     risk_score = min(100, int(risk_score * 5))

#     if risk_score < 30:
#         level = "Low Risk"
#         description = "This area has low recorded crime."
#     elif risk_score < 70:
#         level = "Moderate Risk"
#         description = "Moderate crime frequency detected."
#     else:
#         level = "High Risk"
#         description = "High crime density. Avoid during late hours."

#     return risk_score, level, description
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from math import radians, sin, cos, sqrt, asin
from datetime import datetime

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return R * c

def calculate_risk(df, user_lat, user_lon):

    df["distance"] = df.apply(
        lambda row: haversine(user_lat, user_lon, row["latitude"], row["longitude"]),
        axis=1
    )

    nearby = df[df["distance"] <= 3]

    if nearby.empty:
        return 5, "Low Risk", "No major crimes nearby."

    frequency = len(nearby)
    avg_severity = nearby["severity"].mean()

    recent = nearby[
        pd.to_datetime(nearby["crime_date"]) >
        datetime.now() - pd.Timedelta(days=30)
    ]

    night_weight = 1.5 if datetime.now().hour >= 20 else 1

    risk_score = (
        (frequency * 0.4) +
        (avg_severity * 0.3) +
        (len(recent) * 0.2) +
        (night_weight * 0.1)
    )

    risk_score = min(100, int(risk_score * 5))

    if risk_score < 30:
        level = "Low Risk"
        desc = "Area shows low crime frequency."
    elif risk_score < 70:
        level = "Medium Risk"
        desc = "Moderate crime density detected."
    else:
        level = "High Risk"
        desc = "High crime zone. Avoid late hours."

    return risk_score, level, desc


def detect_hotspots(df):
    coords = df[["latitude", "longitude"]]
    kmeans = KMeans(n_clusters=5)
    df["cluster"] = kmeans.fit_predict(coords)
    return df