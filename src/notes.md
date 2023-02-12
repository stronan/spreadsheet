## Approach

Create a shell, make sure JS can render stuff.

Pick a model
 * want it to be indexed by cell name to make calculations easy
 * need to be able to easily redraw a cell by either cell name or grid reference
 * cells should refer to dependents (to be updated)

Separate grid from sheet data, and only keep data that is actually set

Top-down design - map out functions, put in TODO where necessary

Bottom-up implementation with unit tests

Need to map between row names and indexes
 * don't need to store this though, just use functions

## Assumptions

Want to have text too?

Formatting is for whole cells