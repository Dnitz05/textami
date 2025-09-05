# Anàlisi del problema "Needs re-authentication" persistent

## Fixes aplicats fins ara:
1. ✅ Corregit TypeScript types de profiles table
2. ✅ Afegit variables Supabase a tots els entorns Vercel
3. ✅ Eliminat conflicte OAuth parameters
4. ❌ Problema persisteix

## Possibles causes restants:

### 1. **Token Expiry Logic Error**
```typescript
// a getGoogleConnectionStatus(), línia 276:
const needsReauth = !tokens.refresh_token || tokens.expiry_date <= now;
```
**Problema potencial**: `expiry_date <= now` pot ser massa restrictiu si el token acaba d'expirar.

### 2. **Environment Domain Mismatch** 
```typescript
// a auth.ts, línia 10:
const REDIRECT_URI = `https://${BASE_DOMAIN}/api/auth/google/callback`;
```
**Problema potencial**: BASE_DOMAIN pot no coincidir amb el domini actual.

### 3. **Database Connection Issues**
Encara que les variables estan configurades, pot haver-hi problemes de conexió o permisos.

### 4. **Token Storage/Encryption Issues**
Els tokens poden estar-se guardant però no desencriptant correctament.

### 5. **Session State Issues** 
Problemes amb cookies o state management entre el client i servidor.

## Diagnòstic necessari:
1. Verificar logs del sistema en temps real
2. Comprovar l'estat exacte dels tokens a la base de dades
3. Verificar el flux OAuth complet
4. Revisar domain configuration