# DOCUMENTS OBSOLETS / DUPLICATS

**Data**: 24 Agost 2025  
**Finalitat**: Arxiu de documents que han estat substituïts o duplicats durant la reorganització

---

## DOCUMENTS MOGUTS A OBSOLETE

### `PROJECT_STATUS_OLD.md` (abans `PROJECT_STATUS.md`)
- **Origen**: Arrel del projecte
- **Raó**: Document de status obsolet, substituït per `/docs/CURRENT_STATUS.md`
- **Contingut**: Estado del proyecto con información desactualizada sobre fases completadas

### `IMPLEMENTATION_ROADMAP.md`
- **Origen**: Arrel del projecte  
- **Raó**: Duplicat del document en `/docs/`
- **Contingut**: Roadmap d'implementació basat en UI Reference - mantingut en `/docs/IMPLEMENTATION_ROADMAP.md`

### `ARCHITECTURAL_REPORT.md`
- **Origen**: Arrel del projecte
- **Raó**: Duplicat del document en `/docs/`
- **Contingut**: Informe arquitectural complet - mantingut en `/docs/ARCHITECTURAL_REPORT.md`

---

## DOCUMENTS ELIMINATS DE L'ARREL

Els següents documents existien a l'arrel i han estat consolidats a `/docs/`:

- `ARCHITECTURE.md` → `/docs/ARCHITECTURE.md`
- `CURRENT_STATUS.md` → `/docs/CURRENT_STATUS.md`  
- `DEVELOPMENT_STRATEGY.md` → `/docs/DEVELOPMENT_STRATEGY.md`

---

## ESTRUCTURA FINAL NETA

Tots els documents markdown estan ara organitzats a `/docs/` amb la següent estructura:

```
/docs/
├── ARCHITECTURE.md               # Arquitectura completa del sistema
├── CURRENT_STATUS.md             # Estat actual del projecte  
├── DEVELOPMENT_STRATEGY.md       # Estratègia AI-First, 4 fases
├── IMPLEMENTATION_ROADMAP.md     # Pla d'implementació UI
├── UI_DESIGN_ANALYSIS.md        # Anàlisi del disseny UI Reference
├── UI_REFERENCE_INTERFACE.html  # Interfície HTML de referència
├── ARCHITECTURAL_REPORT.md      # Informe arquitectural per supervisió
└── obsolete/                    # Documents obsolets
    ├── PROJECT_STATUS_OLD.md
    ├── IMPLEMENTATION_ROADMAP.md
    ├── ARCHITECTURAL_REPORT.md
    └── README.md (aquest fitxer)
```

---

**RESULTAT**: Documentació completament organitzada sense duplicacions ni inconsistències.