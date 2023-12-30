Changelog
================================================================

## v3.0.0

* Switched to pnpm
* [BREAKING] Upgraded deps - This caused a very minor error that resulted in not being able to default the `status`
  property to 500, so classes derived from `HttpError` must now explicitly set their status property.
* Implemented eslint and prettier
* Added github CI
* Switched to publishing on npmjs.com

## v1.4.0

* Added public `loglevel` property to `HttpError` to capture the level at which the error
  should be logged

