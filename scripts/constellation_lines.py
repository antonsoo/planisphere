# Self-authored simplified stick figures for the brightest, most widely
# recognized constellations. Each line connects a constellation's classical
# bright named stars (Bayer letter within that constellation) in the pattern
# commonly used to depict it (as popularized by H.A. Rey and used, with
# variation, by most planetarium software) -- compiled independently by
# Bayer/Flamsteed designation, not copied from any single third-party line
# dataset. See docs/constellations.md for the full list and methodology.
#
# Each chain is a list of point identifiers, resolved against
# scripts/vendor/hygdata_v41.csv within that constellation's `con` field:
#   - a plain string like "Alp" is looked up against the `bayer` column
#     (Greek-letter designation, e.g. "Alp", "Bet-1", "Gam-2" for numbered
#     multiple-star components as HYG records them)
#   - a ("flam", N) tuple is looked up against the `flam` column
#     (Flamsteed number) for stars with no Bayer letter
#   - a "name:X" string is looked up against the `proper` column
#     for stars best known by their proper name
CONSTELLATION_LINES = {
    "UMa": {
        "name": "Ursa Major",
        "chains": [
            ["Alp", "Bet", "Gam", "Del", "Alp"],  # bowl: Dubhe-Merak-Phecda-Megrez
            ["Del", "Eps", "Zet", "Eta"],  # handle: Megrez-Alioth-Mizar-Alkaid
        ],
    },
    "UMi": {
        "name": "Ursa Minor",
        "chains": [
            ["Alp", "Del", "Eps", "Zet"],  # handle: Polaris-...-Zeta
            ["Zet", "Bet", "Gam", "Eta", "Zet"],  # bowl
        ],
    },
    "Cas": {
        "name": "Cassiopeia",
        "chains": [
            ["Bet", "Alp", "Gam", "Del", "Eps"],  # the W
        ],
    },
    "Ori": {
        "name": "Orion",
        "chains": [
            ["Alp", "Gam", "Del", "Eps", "Zet", "Alp"],  # shoulders-belt hourglass
            ["Del", "Bet"],  # belt to Rigel
            ["Zet", "Kap"],  # belt to Saiph
            ["Gam", "Lam", "Alp"],  # head cap through Meissa
        ],
    },
    "CMa": {
        "name": "Canis Major",
        "chains": [
            ["Bet", "Alp", "Gam", "Del", "Eta"],  # nose-front leg-neck-chest-tail
            ["Del", "Eps"],  # chest to belly
        ],
    },
    "CMi": {
        "name": "Canis Minor",
        "chains": [
            ["Alp", "Bet"],  # Procyon-Gomeisa
        ],
    },
    "Tau": {
        "name": "Taurus",
        "chains": [
            ["Bet", "Alp", "Zet"],  # horns through the eye (Aldebaran)
            ["Alp", "Gam", "Del-1", "Eps"],  # Hyades V face
        ],
    },
    "Gem": {
        "name": "Gemini",
        "chains": [
            ["Alp", "Bet"],  # the twins' heads: Castor-Pollux
            ["Bet", "Del", "Zet", "Gam"],  # Pollux's body to Alhena
            ["Alp", "Eps", "Mu", "Eta"],  # Castor's body to Propus
        ],
    },
    "Leo": {
        "name": "Leo",
        "chains": [
            ["Eps", "Mu", "Zet", "Gam-1", "Eta", "Alp"],  # sickle (head/mane)
            ["Alp", "The", "Bet"],  # spine: Regulus-Chertan-Denebola
            ["The", "Del"],  # Chertan-Zosma
        ],
    },
    "Vir": {
        "name": "Virgo",
        "chains": [
            ["Bet", "Eta", "Gam", "Eps"],  # top arm
            ["Gam", "Del", "Alp"],  # spine down to Spica
            ["Eps", "Zet", "Alp"],  # other branch down to Spica
        ],
    },
    "Lib": {
        "name": "Libra",
        "chains": [
            ["Bet", "Sig", "Alp-2", "Gam", "Bet"],  # the scales, quadrilateral
        ],
    },
    "Sco": {
        "name": "Scorpius",
        "chains": [
            ["Pi", "Del", "Bet-1"],  # claws/head
            ["Del", "Sig", "Alp", "Tau", "Eps"],  # body
            ["Eps", "Mu-1", "Eta", "The", "Iot-1", "Kap", "Lam", "Ups"],  # tail
        ],
    },
    "Sgr": {
        "name": "Sagittarius",
        "chains": [
            ["Lam", "Phi", "Sig", "Tau"],  # teapot lid
            ["Tau", "Zet", "Eps"],  # teapot handle
            ["Eps", "Del", "Lam"],  # teapot body
            ["Del", "Gam-2"],  # spout
        ],
    },
    "Cap": {
        "name": "Capricornus",
        "chains": [
            ["Bet", "Alp-2", "Zet", "Del", "Gam"],  # horns to tail outline
        ],
    },
    "Aqr": {
        "name": "Aquarius",
        "chains": [
            ["Bet", "Alp", "Gam", "Zet-1", "Eta"],  # water jar zigzag
            ["Alp", "The", "Del"],  # stream down to Skat
        ],
    },
    "Ari": {
        "name": "Aries",
        "chains": [
            ["Gam-2", "Bet", "Alp"],  # Mesarthim-Sheratan-Hamal
        ],
    },
    "Cyg": {
        "name": "Cygnus",
        "chains": [
            ["Alp", "Gam", "Bet-1"],  # Northern Cross, vertical: Deneb-Sadr-Albireo
            ["Del", "Gam", "Eps"],  # horizontal arms
        ],
    },
    "Lyr": {
        "name": "Lyra",
        "chains": [
            ["Alp", "Zet-1", "Del-2", "Gam", "Bet", "Zet-1"],  # Vega + parallelogram
        ],
    },
    "Aql": {
        "name": "Aquila",
        "chains": [
            ["Gam", "Alp", "Bet"],  # spine: Tarazed-Altair-Alshain
            ["Gam", "Zet", "Del", "Lam"],  # NW wing
            ["Bet", "The", "Eta"],  # SE wing
        ],
    },
    "Boo": {
        "name": "Boötes",
        "chains": [
            ["Alp", "Eps", "Del", "Bet", "Gam", "Alp"],  # kite outline
            ["Alp", "Eta"],  # tail
        ],
    },
    "Peg": {
        "name": "Pegasus",
        "chains": [
            ["Bet", "Alp", "Gam"],  # two sides of the Great Square (Peg-only)
            ["Alp", "Zet", "The", "Eps"],  # neck to head (Enif)
        ],
    },
    "And": {
        "name": "Andromeda",
        "chains": [
            ["Alp", "Bet", "Gam-1"],  # main chain: Alpheratz-Mirach-Almach
            ["Bet", "Del"],  # small branch off Mirach
        ],
    },
    "Aur": {
        "name": "Auriga",
        "chains": [
            ["Alp", "Bet", "The", "Iot", "Alp"],  # simplified pentagon
            ["Alp", "Eps", "Zet"],  # the Kids (haedi)
        ],
    },
    "Per": {
        "name": "Perseus",
        "chains": [
            ["Zet", "Eps", "Del", "Alp", "Gam"],  # main spine
            ["Alp", "Kap", "Bet"],  # branch down to Algol
        ],
    },
}
