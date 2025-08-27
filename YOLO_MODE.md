# 🚀 YOLO MODE - Zero Permission Development

**YOLO Mode està ACTIVAT per defecte!**

## Què és YOLO Mode?

YOLO Mode elimina la fricció del desenvolupament executant accions automàticament sense demanar permisos constantement.

## Accions Automàtiques ✅

Aquestes accions s'executen **sense preguntar**:

- ✅ `git add` i `git commit` automàtic
- ✅ `git push` automàtic 
- ✅ `npm install` sense confirmació
- ✅ Modificacions de codi directes
- ✅ Refactoring automàtic
- ✅ Build i deploy automàtic
- ✅ Creació/modificació de fitxers
- ✅ Actualització de dependencies

## Accions que SÍ demanen permís ⚠️

Només per accions **DESTRUCTIVES**:

- ❌ `DELETE_DATABASE`
- ❌ `DROP_TABLES`
- ❌ `DELETE_ALL_FILES` 
- ❌ `RESET_GIT_HISTORY`
- ❌ `DELETE_PRODUCTION_DATA`

## Com funciona

```typescript
import { yolo, autoActions } from './lib/yolo-mode';

// Auto-commit i push
await autoActions.yoloCommitAndPush('feat: new feature');

// Deploy complet automàtic
await autoActions.yoloFullDeploy();

// Refactor i deploy
await autoActions.yoloRefactorAndDeploy('clean up components');
```

## Exemples d'ús

### Abans (amb permisos):
```
User: "Add a new component"
Assistant: "Shall I create the component file?"
User: "Yes"
Assistant: "Should I commit the changes?"
User: "Yes" 
Assistant: "Do you want me to push to GitHub?"
User: "Yes"
```

### Ara (YOLO Mode):
```
User: "Add a new component"
Assistant: [Creates component, commits, pushes] ✅ Done!
```

## Logging YOLO

```typescript
log.yolo('Executing auto-commit', { files: ['src/'] });
// Output: 🚀 YOLO: Executing auto-commit
```

## Status

**🚀 YOLO MODE: ACTIVAT**  
Desenvolupament sense fricció - màxima velocitat!